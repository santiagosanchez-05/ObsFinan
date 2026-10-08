import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CitaAcademica from './CitaAcademica';

describe('CitaAcademica', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('arma la cita APA del dataset ICA con título en cursiva y la URL del dashboard', () => {
    render(<CitaAcademica recurso="ica" />);
    const texto = screen.getByTestId('texto-cita');
    expect(texto).toHaveTextContent(
      new RegExp(`^Observatorio de Bienestar Financiero Univalle\\. \\(${new Date().getFullYear()}\\)\\. Índice de Calidad Aseguradora \\(ICA\\) \\[Conjunto de datos\\]\\. Universidad Privada del Valle\\. Recuperado el .+, de ${window.location.origin}/ica$`),
    );
    expect(texto.querySelector('em')).toHaveTextContent('Índice de Calidad Aseguradora (ICA)');
  });

  it('copia la cita al portapapeles y avisa', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<CitaAcademica recurso="spe" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar cita' }));

    expect(await screen.findByText('¡Cita copiada!')).toBeInTheDocument();
    expect(writeText.mock.calls[0][0]).toContain('Encuesta Única Integrada del Sector Privado Exportador SOCOMEX–SOCIFIN [Conjunto de datos]');
    expect(writeText.mock.calls[0][0]).toContain(`${window.location.origin}/spe`);
  });

  it('si el navegador no deja copiar, pide copiarla a mano', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('no')) }, configurable: true });

    render(<CitaAcademica />);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar cita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Selecciona el texto y cópialo a mano');
  });
});
