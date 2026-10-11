import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import BotonTema from './BotonTema';
import { CLAVE_TEMA } from './tema';

describe('BotonTema (modo oscuro)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('activa el modo oscuro y lo recuerda', () => {
    render(<BotonTema />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo oscuro' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    expect(screen.getByRole('button', { name: 'Activar modo claro' })).toBeInTheDocument();
  });

  it('vuelve al modo claro', () => {
    localStorage.setItem(CLAVE_TEMA, 'oscuro');
    document.documentElement.classList.add('dark');
    render(<BotonTema />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar modo claro' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('claro');
  });
});

describe('BotonTema — varios botones', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('el botón de desktop y el de mobile muestran siempre el mismo estado', () => {
    render(<><BotonTema /><BotonTema /></>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Activar modo oscuro' })[0]);
    expect(screen.getAllByRole('button', { name: 'Activar modo claro' })).toHaveLength(2);
  });
});
