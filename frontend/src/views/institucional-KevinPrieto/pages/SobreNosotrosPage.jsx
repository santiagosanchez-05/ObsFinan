import React from 'react';
import { Link } from 'react-router-dom';
import CitaAcademica from '../../../shared/CitaAcademica';

export const SobreNosotrosPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* 1. ¿Qué es el Observatorio de Bienestar Financiero? */}
      <section className="bg-slate-100/60 px-6 py-16 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
            ¿Qué es el Observatorio de Bienestar Financiero?
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            El Observatorio de Bienestar Financiero es una iniciativa de investigación aplicada de la
            Universidad Privada del Valle (Univalle), que recopila, analiza y publica de forma abierta
            indicadores sobre la salud financiera de los hogares, las MYPEs y el sector exportador de
            Bolivia.
          </p>
        </div>
      </section>

      {/* 2. ¿Para qué sirve? */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">¿Para qué sirve?</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Sirve como fuente pública y actualizada de datos para que investigadores, periodistas, formuladores de política pública, y la ciudadanía en general puedan entender cómo evoluciona el bienestar financiero en Bolivia — más allá del ámbito universitario.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Transparencia de Datos</h3>
                  <p className="text-sm text-slate-500">Acceso irrestricto a métricas de salud económica.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Toma de Decisiones</h3>
                  <p className="text-sm text-slate-500">Insumos críticos para políticas de inclusión financiera.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1664575197593-2e7085ef086b?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Análisis de datos financieros"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* 3. ¿Qué analiza? */}
      <section className="bg-slate-100/60 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-extrabold text-slate-900">¿Qué analiza?</h2>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 8v2m0-10e-1 0 2.08.402 2.599 1M12 18c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">ICA — Índice de Calidad Aseguradora</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Mide el conocimiento sobre seguros, el uso de seguros, la educación aseguradora y la previsión frente a riesgos de los hogares en distintas comunas.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">SPE — Sector Privado Exportador</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Mide, con la encuesta SOCOMEX–SOCIFIN, las expectativas empresariales (IEE), la competitividad (ICE), la internacionalización (IIE) y el clima para la inversión (ICIE) de las empresas bolivianas exportadoras.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Metodología */}
      <section className="bg-zinc-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-extrabold">Metodología</h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 font-bold text-white">
                1
              </div>
              <h3 className="font-bold text-white">Recolección</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Encuesta trimestral del ICA en comunas de las sedes de Univalle (Cochabamba, con expansión prevista a La Paz, Santa Cruz, Sucre y Trinidad).
              </p>
            </div>

            <div>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 font-bold text-white">
                2
              </div>
              <h3 className="font-bold text-white">Validación</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Cada carga de datos es revisada y validada por administradores de cada sede antes de publicarse oficialmente en el sistema.
              </p>
            </div>

            <div>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 font-bold text-white">
                3
              </div>
              <h3 className="font-bold text-white">Dimensiones</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                El ICA se mide en 4 dimensiones: Conocimiento, Uso, Educación y Previsión, desagregadas por género y comuna.
              </p>
            </div>

            <div>
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 font-bold text-white">
                4
              </div>
              <h3 className="font-bold text-white">Publicación abierta</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Los resultados se publican en dashboards de libre consulta para toda la ciudadanía, sin necesidad de registro previo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo citar (Santiago — cita académica) */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <CitaAcademica recurso="observatorio" />
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="bg-zinc-950 px-6 py-12 text-zinc-400 border-t border-zinc-800">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
          
          {/* Columna 1: Univalle */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-pink-700 font-bold text-white text-xs">
                U
              </div>
              <span className="font-bold text-white text-lg">Univalle</span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-400">
              Observatorio de Bienestar Financiero, dedicado a proporcionar datos precisos para la toma de decisiones en Bolivia.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.72a1.48 1.48 0 1 0 0 2.95 1.48 1.48 0 0 0 0-2.95z"/>
                </svg>
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
                <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </a>
              <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Columna 2: Contacto */}
          <div>
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">Contacto</h4>
            <ul className="mt-4 space-y-3 text-xs">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Campus Tiquipaya, Cochabamba, Bolivia</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-pink-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>observatorio@univalle.edu</span>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-pink-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+591 (4) 431 8800</span>
              </li>
            </ul>
          </div>

          {/* Columna 3: Enlaces */}
          <div>
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">Enlaces</h4>
            <ul className="mt-4 space-y-2 text-xs">
              <li><Link to="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link to="/sobre-nosotros" className="hover:text-white transition-colors">Metodología</Link></li>
              <li><Link to="/" className="hover:text-white transition-colors">Dashboards</Link></li>
              <li><Link to="/sobre-nosotros" className="hover:text-white transition-colors">Sedes</Link></li>
            </ul>
          </div>

          {/* Columna 4: Investigación */}
          <div>
            <h4 className="font-bold text-white text-sm tracking-wider uppercase">Investigación</h4>
            <div className="mt-4 rounded-xl bg-zinc-900/80 p-4 border border-zinc-800">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Próxima Publicación
              </span>
              <p className="mt-1 font-semibold text-xs text-white">
                "Informe Semestral SPE - Q4 2024"
              </p>
              <span className="mt-2 block text-xs font-bold text-pink-600">
                Diciembre 2024
              </span>
            </div>
          </div>

        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500">
          <p>© 2024 Universidad Privada del Valle. Todos los derechos reservados.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <a href="#" className="hover:text-zinc-400">Términos de uso</a>
            <a href="#" className="hover:text-zinc-400">Privacidad</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default SobreNosotrosPage;