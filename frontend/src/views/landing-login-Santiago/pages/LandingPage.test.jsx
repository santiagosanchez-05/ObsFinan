import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import PublicLayout from '../../../shared/PublicLayout';
import LandingPage from './LandingPage';

function renderLanding() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('LandingPage (US2)', () => {
  it('renderiza el hero, los indicadores y el acceso a la plataforma', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Midiendo el Bienestar Financiero en Bolivia');
    expect(screen.getByText('Índice de Calidad Aseguradora (ICA)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Iniciar sesión en la plataforma/ })).toHaveAttribute('href', '/login');
  });

  it('ya no menciona el nombre viejo del ICA', () => {
    renderLanding();
    expect(document.body.textContent).not.toMatch(/ahorro comunitario/i);
  });

  it('describe al visitante como acceso libre (Cliente ya no es un rol)', () => {
    renderLanding();
    expect(screen.getByText('Visitante')).toBeInTheDocument();
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument();
  });

  it('el nav público lleva a los dashboards ICA y Sector Privado Exportador', () => {
    renderLanding();

    const nav = screen.getAllByRole('navigation')[0];
    expect(within(nav).getByRole('link', { name: 'ICA' })).toHaveAttribute('href', '/ica');
    expect(within(nav).getByRole('link', { name: 'Sector Privado Exportador' })).toHaveAttribute('href', '/spe');
  });

  it('el footer también enlaza a los dos dashboards', () => {
    renderLanding();

    expect(screen.getByRole('link', { name: 'Dashboard ICA' })).toHaveAttribute('href', '/ica');
    expect(screen.getByRole('link', { name: 'Dashboard Sector Privado Exportador' })).toHaveAttribute('href', '/spe');
  });

  it('en celular el menú hamburguesa muestra los mismos links', () => {
    renderLanding();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const navs = screen.getAllByRole('navigation');
    const mobile = navs[navs.length - 1];
    expect(within(mobile).getByRole('link', { name: 'ICA' })).toBeInTheDocument();
    expect(within(mobile).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });
});
