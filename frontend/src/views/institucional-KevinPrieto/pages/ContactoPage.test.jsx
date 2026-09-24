import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContactoPage from './ContactoPage';

const SEDES = [
  { id: 1, nombre: 'Cochabamba' },
  { id: 3, nombre: 'Santa Cruz' },
];

function mockFetch({ envio = { ok: true, body: { message: 'ok' } }, sedes = SEDES } = {}) {
  global.fetch = vi.fn((url, init) => {
    if (url === '/api/contacto/sedes') return Promise.resolve({ ok: true, json: async () => sedes });
    if (url === '/api/contacto' && init?.method === 'POST') {
      return Promise.resolve({ ok: envio.ok, json: async () => envio.body });
    }
    return Promise.reject(new Error(`fetch inesperado: ${url}`));
  });
}

function renderPage() {
  render(
    <MemoryRouter>
      <ContactoPage />
    </MemoryRouter>,
  );
}

function completarFormulario() {
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'María' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'maria@test.com' } });
  fireEvent.change(screen.getByLabelText('Sede'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: 'Consulta' } });
  fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Hola' } });
}

describe('ContactoPage (US32)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('carga las sedes desde la BD (no una lista fija en el código)', async () => {
    mockFetch();
    renderPage();

    expect(await screen.findByRole('option', { name: 'Santa Cruz' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Sucre' })).not.toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/contacto/sedes');
  });

  it('si hay una sola sede, la deja elegida de entrada', async () => {
    mockFetch({ sedes: [{ id: 1, nombre: 'Cochabamba' }] });
    renderPage();

    await waitFor(() => expect(screen.getByLabelText('Sede')).toHaveValue('1'));
  });

  it('manda el formulario con la sede elegida y muestra el éxito', async () => {
    mockFetch();
    renderPage();
    await screen.findByRole('option', { name: 'Santa Cruz' });

    completarFormulario();
    fireEvent.change(screen.getByLabelText(/Institución/), { target: { value: 'UMSS' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar mensaje/ }));

    expect(await screen.findByText('Mensaje enviado correctamente al administrador de la sede.')).toBeInTheDocument();
    const [, init] = global.fetch.mock.calls.find(([url, opts]) => url === '/api/contacto' && opts?.method === 'POST');
    expect(JSON.parse(init.body)).toEqual({
      nombre: 'María',
      correo: 'maria@test.com',
      institucion: 'UMSS',
      sedeId: '3',
      asunto: 'Consulta',
      mensaje: 'Hola',
    });
  });

  it('muestra el error que devuelve el backend', async () => {
    mockFetch({ envio: { ok: false, body: { error: 'La sede seleccionada no existe o no está activa' } } });
    renderPage();
    await screen.findByRole('option', { name: 'Santa Cruz' });

    completarFormulario();
    fireEvent.click(screen.getByRole('button', { name: /Enviar mensaje/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La sede seleccionada no existe o no está activa');
  });

  it('el botón de envío usa el color de la marca (no el azul genérico)', async () => {
    mockFetch();
    renderPage();
    await screen.findByRole('option', { name: 'Santa Cruz' });

    const boton = screen.getByRole('button', { name: /Enviar mensaje/ });
    expect(boton).toHaveClass('bg-maroon');
    expect(boton.getAttribute('style') ?? '').not.toContain('#007bff');
  });
});
