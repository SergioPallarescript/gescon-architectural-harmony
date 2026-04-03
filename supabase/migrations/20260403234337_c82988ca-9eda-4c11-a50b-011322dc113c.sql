DELETE FROM public.onboarding_steps WHERE page_route IN ('/project/:id/dwg', '/project/:id/plans', '/project/:id/costs');

INSERT INTO public.onboarding_steps (role, page_route, step_order, target_element, title, content, is_active)
VALUES
('DO', '/project/:id/dwg', 1, '[data-tour="dwg-load-pdf"]', 'Cargar PDF', 'Carga el PDF del plano para activar las herramientas de navegación y medición sobre el documento.', true),
('DO', '/project/:id/dwg', 2, '[data-tour="dwg-move"]', 'Mover y zoom', 'Usa este modo para desplazarte por el plano. El zoom se hace con la rueda del ratón o con el gesto de pinza en móvil.', true),
('DO', '/project/:id/dwg', 3, '[data-tour="dwg-calibrate"]', 'Calibrar', 'Antes de medir, marca dos puntos de una cota conocida e introduce la distancia real para ajustar la escala.', true),
('DO', '/project/:id/dwg', 4, '[data-tour="dwg-measure"]', 'Medir', 'Con la escala calibrada, mide distancias lineales directamente sobre el plano.', true),
('DO', '/project/:id/dwg', 5, '[data-tour="dwg-area"]', 'Área', 'Calcula superficies marcando el perímetro del recinto sobre el plano.', true),
('DO', '/project/:id/dwg', 6, '[data-tour="dwg-clean"]', 'Limpiar', 'Borra las mediciones en pantalla para empezar una nueva comprobación.', true),

('DEM', '/project/:id/dwg', 1, '[data-tour="dwg-load-pdf"]', 'Cargar PDF', 'Carga el PDF del plano para activar las herramientas de navegación y medición sobre el documento.', true),
('DEM', '/project/:id/dwg', 2, '[data-tour="dwg-move"]', 'Mover y zoom', 'Usa este modo para desplazarte por el plano. El zoom se hace con la rueda del ratón o con el gesto de pinza en móvil.', true),
('DEM', '/project/:id/dwg', 3, '[data-tour="dwg-calibrate"]', 'Calibrar', 'Antes de medir, marca dos puntos de una cota conocida e introduce la distancia real para ajustar la escala.', true),
('DEM', '/project/:id/dwg', 4, '[data-tour="dwg-measure"]', 'Medir', 'Con la escala calibrada, mide distancias lineales directamente sobre el plano.', true),
('DEM', '/project/:id/dwg', 5, '[data-tour="dwg-area"]', 'Área', 'Calcula superficies marcando el perímetro del recinto sobre el plano.', true),
('DEM', '/project/:id/dwg', 6, '[data-tour="dwg-clean"]', 'Limpiar', 'Borra las mediciones en pantalla para empezar una nueva comprobación.', true),

('CON', '/project/:id/dwg', 1, '[data-tour="dwg-load-pdf"]', 'Cargar PDF', 'Carga el PDF del plano para activar las herramientas de navegación y medición sobre el documento.', true),
('CON', '/project/:id/dwg', 2, '[data-tour="dwg-move"]', 'Mover y zoom', 'Usa este modo para desplazarte por el plano. El zoom se hace con la rueda del ratón o con el gesto de pinza en móvil.', true),
('CON', '/project/:id/dwg', 3, '[data-tour="dwg-calibrate"]', 'Calibrar', 'Antes de medir, marca dos puntos de una cota conocida e introduce la distancia real para ajustar la escala.', true),
('CON', '/project/:id/dwg', 4, '[data-tour="dwg-measure"]', 'Medir', 'Con la escala calibrada, mide distancias lineales directamente sobre el plano.', true),
('CON', '/project/:id/dwg', 5, '[data-tour="dwg-area"]', 'Área', 'Calcula superficies marcando el perímetro del recinto sobre el plano.', true),
('CON', '/project/:id/dwg', 6, '[data-tour="dwg-clean"]', 'Limpiar', 'Borra las mediciones en pantalla para empezar una nueva comprobación.', true),

('PRO', '/project/:id/dwg', 1, '[data-tour="dwg-load-pdf"]', 'Cargar PDF', 'Carga el PDF del plano para activar las herramientas de navegación y medición sobre el documento.', true),
('PRO', '/project/:id/dwg', 2, '[data-tour="dwg-move"]', 'Mover y zoom', 'Usa este modo para desplazarte por el plano. El zoom se hace con la rueda del ratón o con el gesto de pinza en móvil.', true),
('PRO', '/project/:id/dwg', 3, '[data-tour="dwg-calibrate"]', 'Calibrar', 'Antes de medir, marca dos puntos de una cota conocida e introduce la distancia real para ajustar la escala.', true),
('PRO', '/project/:id/dwg', 4, '[data-tour="dwg-measure"]', 'Medir', 'Con la escala calibrada, mide distancias lineales directamente sobre el plano.', true),
('PRO', '/project/:id/dwg', 5, '[data-tour="dwg-area"]', 'Área', 'Calcula superficies marcando el perímetro del recinto sobre el plano.', true),
('PRO', '/project/:id/dwg', 6, '[data-tour="dwg-clean"]', 'Limpiar', 'Borra las mediciones en pantalla para empezar una nueva comprobación.', true),

('CSS', '/project/:id/dwg', 1, '[data-tour="dwg-load-pdf"]', 'Cargar PDF', 'Carga el PDF del plano para activar las herramientas de navegación y medición sobre el documento.', true),
('CSS', '/project/:id/dwg', 2, '[data-tour="dwg-move"]', 'Mover y zoom', 'Usa este modo para desplazarte por el plano. El zoom se hace con la rueda del ratón o con el gesto de pinza en móvil.', true),
('CSS', '/project/:id/dwg', 3, '[data-tour="dwg-calibrate"]', 'Calibrar', 'Antes de medir, marca dos puntos de una cota conocida e introduce la distancia real para ajustar la escala.', true),
('CSS', '/project/:id/dwg', 4, '[data-tour="dwg-measure"]', 'Medir', 'Con la escala calibrada, mide distancias lineales directamente sobre el plano.', true),
('CSS', '/project/:id/dwg', 5, '[data-tour="dwg-area"]', 'Área', 'Calcula superficies marcando el perímetro del recinto sobre el plano.', true),
('CSS', '/project/:id/dwg', 6, '[data-tour="dwg-clean"]', 'Limpiar', 'Borra las mediciones en pantalla para empezar una nueva comprobación.', true),

('DO', '/project/:id/plans', 1, '[data-tour="upload-version"]', 'Subir versión', 'Sube aquí una nueva versión del plano. La versión nueva pasa a ser la válida para obra y el histórico queda guardado.', true),
('DO', '/project/:id/plans', 2, '[data-tour="conformity-section"]', 'Sistema de validación', 'Cuando ya existe una versión cargada, este bloque centraliza toda la conformidad de agentes para esa versión.', true),
('DO', '/project/:id/plans', 3, '[data-tour="conformity-roles"]', 'Roles pendientes', 'Aquí ves qué roles ya han confirmado y qué validaciones siguen pendientes antes de considerar el plano confirmado.', true),
('DO', '/project/:id/plans', 4, '[data-tour="confirm-conformity"]', 'Confirmar conformidad', 'Cuando revises la versión vigente, registra tu conformidad desde este botón.', true),

('DEM', '/project/:id/plans', 1, '[data-tour="upload-version"]', 'Subir versión', 'Sube aquí una nueva versión del plano. La versión nueva pasa a ser la válida para obra y el histórico queda guardado.', true),
('DEM', '/project/:id/plans', 2, '[data-tour="conformity-section"]', 'Sistema de validación', 'Cuando ya existe una versión cargada, este bloque centraliza toda la conformidad de agentes para esa versión.', true),
('DEM', '/project/:id/plans', 3, '[data-tour="conformity-roles"]', 'Roles pendientes', 'Aquí ves qué roles ya han confirmado y qué validaciones siguen pendientes antes de considerar el plano confirmado.', true),
('DEM', '/project/:id/plans', 4, '[data-tour="confirm-conformity"]', 'Confirmar conformidad', 'Cuando revises la versión vigente, registra tu conformidad desde este botón.', true),

('CON', '/project/:id/plans', 1, '[data-tour="conformity-section"]', 'Sistema de validación', 'Este bloque aparece cuando ya hay una versión subida y reúne toda la validación del plano vigente.', true),
('CON', '/project/:id/plans', 2, '[data-tour="conformity-roles"]', 'Roles pendientes', 'Revisa aquí qué agentes ya han validado y cuáles faltan para completar la conformidad del plano.', true),
('CON', '/project/:id/plans', 3, '[data-tour="confirm-conformity"]', 'Confirmar conformidad', 'Cuando completes tu revisión, registra aquí tu conformidad para esta versión.', true),

('PRO', '/project/:id/plans', 1, '[data-tour="conformity-section"]', 'Sistema de validación', 'Este bloque aparece cuando ya hay una versión subida y reúne toda la validación del plano vigente.', true),
('PRO', '/project/:id/plans', 2, '[data-tour="conformity-roles"]', 'Roles pendientes', 'Revisa aquí qué agentes ya han validado y cuáles faltan para completar la conformidad del plano.', true),
('PRO', '/project/:id/plans', 3, '[data-tour="confirm-conformity"]', 'Confirmar conformidad', 'Cuando completes tu revisión, registra aquí tu conformidad para esta versión.', true),

('CSS', '/project/:id/plans', 1, '[data-tour="conformity-section"]', 'Sistema de validación', 'Este bloque aparece cuando ya hay una versión subida y reúne toda la validación del plano vigente.', true),
('CSS', '/project/:id/plans', 2, '[data-tour="conformity-roles"]', 'Roles pendientes', 'Revisa aquí qué agentes ya han validado y cuáles faltan para completar la conformidad del plano.', true),
('CSS', '/project/:id/plans', 3, '[data-tour="confirm-conformity"]', 'Confirmar conformidad', 'Cuando completes tu revisión, registra aquí tu conformidad para esta versión.', true),

('DO', '/project/:id/costs', 1, '[data-tour="cost-open"]', 'Abrir documento', 'Abre el documento y revísalo en la previsualización antes de iniciar la firma técnica.', true),
('DO', '/project/:id/costs', 2, '[data-tour="cost-download"]', 'Descargar', 'Si descargas el archivo antes de firmarlo, se descargará sin tu firma técnica.', true),
('DO', '/project/:id/costs', 3, '[data-tour="cost-certificate-tab"]', 'Certificado digital', 'Selecciona esta pestaña para firmar con tu certificado digital.', true),
('DO', '/project/:id/costs', 4, '[data-tour="cert-file-input"]', 'Cargar certificado', 'Sube aquí tu archivo .p12 o .pfx para preparar la firma.', true),
('DO', '/project/:id/costs', 5, '[data-tour="cert-load-button"]', 'Validar certificado', 'Comprueba el certificado antes de firmar el documento.', true),
('DO', '/project/:id/costs', 6, '[data-tour="cert-sign-button"]', 'Firmar documento', 'Cuando el certificado esté validado, completa aquí la firma del PDF.', true),

('DEM', '/project/:id/costs', 1, '[data-tour="cost-open"]', 'Abrir documento', 'Abre el documento y revísalo en la previsualización antes de iniciar la firma técnica.', true),
('DEM', '/project/:id/costs', 2, '[data-tour="cost-download"]', 'Descargar', 'Si descargas el archivo antes de firmarlo, se descargará sin tu firma técnica.', true),
('DEM', '/project/:id/costs', 3, '[data-tour="cost-certificate-tab"]', 'Certificado digital', 'Selecciona esta pestaña para firmar con tu certificado digital.', true),
('DEM', '/project/:id/costs', 4, '[data-tour="cert-file-input"]', 'Cargar certificado', 'Sube aquí tu archivo .p12 o .pfx para preparar la firma.', true),
('DEM', '/project/:id/costs', 5, '[data-tour="cert-load-button"]', 'Validar certificado', 'Comprueba el certificado antes de firmar el documento.', true),
('DEM', '/project/:id/costs', 6, '[data-tour="cert-sign-button"]', 'Firmar documento', 'Cuando el certificado esté validado, completa aquí la firma del PDF.', true),

('PRO', '/project/:id/costs', 1, '[data-tour="cost-open"]', 'Abrir documento', 'Abre el documento y revísalo en la previsualización antes de iniciar la firma o autorización.', true),
('PRO', '/project/:id/costs', 2, '[data-tour="cost-download"]', 'Descargar', 'Si descargas el archivo antes de firmarlo, se descargará sin tu firma de validación.', true),
('PRO', '/project/:id/costs', 3, '[data-tour="cost-certificate-tab"]', 'Certificado digital', 'Selecciona esta pestaña para firmar con tu certificado digital.', true),
('PRO', '/project/:id/costs', 4, '[data-tour="cert-file-input"]', 'Cargar certificado', 'Sube aquí tu archivo .p12 o .pfx para preparar la firma.', true),
('PRO', '/project/:id/costs', 5, '[data-tour="cert-load-button"]', 'Validar certificado', 'Comprueba el certificado antes de firmar el documento.', true),
('PRO', '/project/:id/costs', 6, '[data-tour="cert-sign-button"]', 'Firmar documento', 'Cuando el certificado esté validado, completa aquí la firma del PDF.', true);

DELETE FROM public.user_onboarding_status WHERE page_route IN ('/project/:id/dwg', '/project/:id/plans', '/project/:id/costs');