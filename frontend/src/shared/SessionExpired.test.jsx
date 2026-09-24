import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SessionExpiredModal from './SessionExpiredModal';
import apiFetch, { SessionExpiredError } from './apiFetch';

// US26 — aviso de sesión expirada: el modal y el interceptor de 401.

function renderModal(open, onFinish) {
  render(
    <MemoryRouter initialEntries={['/ica/historial']}>
      <Routes>
        <Route path="/ica/historial" element={<SessionExpiredModal open={open} onFinish={onFinish} />} />
        <Route path="/login" element={<p>Pantalla de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SessionExpiredModal (US26)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cerrado no muestra nada', () => {
    renderModal(false, vi.fn());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('abierto avisa que la sesión expiró', () => {
    renderModal(true, vi.fn());
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Su sesión expiró');
  });

  it('a los 2 segundos cierra la sesión y redirige al login', () => {
    const onFinish = vi.fn();
    renderModal(true, onFinish);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onFinish).toHaveBeenCalled();
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });
});

describe('apiFetch — interceptor de 401 (US26)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('con 401 dispara el evento de sesión expirada y lanza SessionExpiredError', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 401 });
    const escucha = vi.fn();
    window.addEventListener('bfu:session-expired', escucha);

    await expect(apiFetch('/api/ica/historial')).rejects.toBeInstanceOf(SessionExpiredError);

    expect(escucha).toHaveBeenCalled();
    expect(localStorage.getItem('bfu_session_expired')).not.toBeNull();
    window.removeEventListener('bfu:session-expired', escucha);
  });

  it('con otra respuesta la devuelve tal cual', async () => {
    const respuesta = { status: 200, ok: true };
    global.fetch = vi.fn().mockResolvedValue(respuesta);

    await expect(apiFetch('/api/ica')).resolves.toBe(respuesta);
  });
});
