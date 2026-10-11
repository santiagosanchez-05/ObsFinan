import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useCorreoContacto, CORREO_GENERICO } from './useCorreoContacto';

function Correo() {
  return <span>{useCorreoContacto()}</span>;
}

describe('useCorreoContacto', () => {
  it('muestra el correo del Superadmin que devuelve la API', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ correo: 'super@correo.com' }) });
    render(<Correo />);
    await waitFor(() => expect(screen.getByText('super@correo.com')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/contacto/correo', expect.anything());
  });

  it('si no hay Superadmin activo o falla, deja el correo genérico', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ correo: null }) });
    render(<Correo />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByText(CORREO_GENERICO)).toBeInTheDocument();
  });
});
