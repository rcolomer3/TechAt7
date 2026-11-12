# TechAt7

PWA personal React/Vite con Google Authentication, Firestore, notificaciones FCM y GitHub Pages. Conserva el diseño, la apariencia, Updates, Eventos y el historial.

## Flujo de publicación

**ChatGPT busca y resume → escribe editions/AAAA-MM-DD.json en GitHub → GitHub Actions valida y guarda en Firebase → TechAt7 lee Firebase.**

No se utiliza Gemini, Ollama ni una API de IA de pago. GitHub no genera noticias. El antiguo extractor RSS se ha retirado del proceso de publicación para impedir que un solo titular en inglés se presente como edición diaria.

El contrato de edición y las instrucciones editoriales están en [editions/README.md](editions/README.md). Se requieren 10–20 noticias (objetivo 15–20), 4–5 frases en español por tarjeta, fuentes verificables al artículo concreto, al menos tres dominios de fuentes y ausencia de repeticiones. Los controles de idioma, estructura, fechas y duplicados son automáticos. La comprobación de hechos corresponde a la tarea de ChatGPT: estos validadores no certifican por sí solos la veracidad del contenido.

La tarea de ChatGPT debe poder usar el plugin GitHub y publicar en rcolomer3/TechAt7. El repositorio ya está autorizado para escritura en ChatGPT Codex Connector. Hay que validar también una ejecución real de la tarea programada; la autorización de un chat no demuestra esa capacidad por sí sola.

## Horario

A partir de las **19:00 Europe/Madrid** GitHub publica la edición que haya entregado ChatGPT. Si el commit activa el publicador entre las **18:00 y las 19:00**, la propia ejecución espera hasta las 19:00 y publica la última revisión disponible en `main`. Antes de las 18:00, valida y guarda un borrador privado. Si el publicador arranca a partir de las 19:00, intenta publicar directamente.

Los intentos programados de las **19:05, 19:20, 19:45, 20:15, 20:40 y 21:05** sirven de respaldo. Al completar los avisos con al menos un envío aceptado por Firebase y sin resultados inciertos, el publicador guarda un registro para esa edición. Los siguientes intentos terminan sin volver a consultar los dispositivos ni enviar avisos.

Cada ejecución programada revisa también la edición del día anterior. Si arranca entre medianoche y las 02:00 de Madrid, todavía puede publicar y enviar el aviso de esa edición. A partir de las 02:00 la recupera en Anteriores sin enviar un aviso atrasado. Desde las 19:00 comprueba ambas fechas.

No existe publicación si falta el archivo o falla una comprobación. En ese caso Actions muestra el error, conserva el historial y no envía un aviso falso. Revisa que ChatGPT haya terminado su edición; no se rellena con titulares, noticias antiguas o contenido inventado.

Las ediciones se guardan completas de forma atómica en digests/AAAA-MM-DD antes de enviar notificaciones. Son inmutables; los extractos del formato antiguo se conservan en digestRevisions al corregirlos. El historial se conserva en Firestore; la interfaz permite consultar todas las ediciones publicadas. Anteriores excluye la fecha de hoy en Madrid y muestra todas las fechas por defecto. Guardadas permite conservar noticias y recuperarlas en cualquier dispositivo con la misma cuenta. Los marcadores se sincronizan en users/{uid}/saved y guardan una copia del artículo. Las preferencias de categorías y el límite de noticias se sincronizan en users/{uid}/preferences/radar. Si las reglas de esa ruta aún no están publicadas, la app usa automáticamente un documento reservado en users/{uid}/saved y lo oculta de Guardadas; al publicar las reglas vuelve a la ruta principal. La demo utiliza almacenamiento local independiente. El workflow Firestore rules puede desplegar las reglas con el secreto FIREBASE_SERVICE_ACCOUNT, pero requiere que la cuenta de servicio tenga permisos de reglas; si no, la app sigue funcionando con el documento reservado. Check comprueba su privacidad con emuladores. Pages publica únicamente la web. Las tarjetas muestran una entradilla breve y permiten ampliar el resumen completo.

Un registro por fecha/dispositivo se reserva antes de llamar a FCM. Reejecuciones manuales y programadas comparten el mismo registro. Ante un error de transporte ambiguo no se reenvía automáticamente: evita duplicados, pero puede perderse el aviso. FCM aceptado no equivale a entrega física garantizada. La notificación abre directamente ?edition=AAAA-MM-DD, también si se pulsa días después.

### Avisos manuales

El workflow **Enviar aviso** (`.github/workflows/notify.yml`) envía una notificación push puntual a todos los dispositivos registrados sin publicar ni modificar ninguna edición. Se lanza desde Actions → Enviar aviso → Run workflow con un identificador único, un título y un texto. El identificador evita duplicados: reejecutar el mismo aviso no vuelve a enviarlo. La opción «Solo contar dispositivos, sin enviar» permite comprobar el alcance. Los avisos manuales abren la app en Hoy.

## Credenciales y coste

- FIREBASE_SERVICE_ACCOUNT: secreto cifrado de GitHub Actions, ya configurado. ChatGPT no necesita conocerlo.
- Firebase Spark sin facturación: Google Authentication, Firestore dentro de sus cuotas y FCM. Una cuota agotada puede detener el servicio.
- GitHub Pages y runners estándar de Actions en este repositorio público, sin contratar planes de pago.
- ChatGPT utiliza los límites de tu suscripción o cuenta. No hay consumo de una API externa ni se contratan créditos adicionales. La disponibilidad de herramientas y tareas depende de tu cuenta.
- Configuración pública de Firebase y VAPID en src/firebase-config.ts. Los valores VITE_* son públicos y pueden sobrescribirla. Nunca poner cuentas de servicio o claves privadas en el frontend.

No convertir el repositorio en privado ni cambiar a runners de pago sin revisar las condiciones. Referencias: https://firebase.google.com/pricing y https://docs.github.com/en/actions/reference/runners/github-hosted-runners .

## Desarrollo y validación

```sh
npm ci
npm run dev
npm test
npm run build
```

Para ver ejemplos sin login: VITE_DEMO=true en .env.local. Las tarjetas de demostración están identificadas y no son noticias reales.

Validar un archivo sin credenciales, escritura remota o avisos:

```sh
node scripts/daily.mjs --dry-run
```

Por defecto valida la edición de hoy en Madrid. Para otra fecha, define RADAR_DATE=AAAA-MM-DD y RADAR_ARCHIVE=true. El resultado queda en work/publication-report.json (ignorado por Git).

En GitHub → Actions → Daily radar → Run workflow puedes volver a ejecutar el publicador. La opción archive importa una edición histórica sin enviar avisos. Nunca se envían avisos desde una validación en seco.

Pruebas: rechazo de ediciones de una noticia, textos ingleses, resúmenes incompletos, portadas en lugar de artículos, fuentes insuficientes, fechas y noticias repetidas, y envío único incluso con reintentos concurrentes o errores ambiguos.

## Seguridad e instalación

Reglas e índices en firestore.rules y firestore.indexes.json. El workflow Firestore rules se lanza manualmente desde Actions y publica las reglas solo si la cuenta de servicio tiene permisos de administración de reglas de Firebase. Si no los tiene, la app sigue funcionando con el documento reservado descrito en Categorías y preferencias. El cliente solo lee noticias publicadas; no escribe ediciones. Cada usuario autenticado administra sus propios tokens, marcadores y preferencias. Los borradores, revisiones y registros de entrega quedan privados por denegación por defecto. Admin SDK omite las reglas: protege el secreto y los permisos de escritura del repositorio.

Proyecto independiente techradar-4f238, Firestore Madrid, dominio autorizado rcolomer3.github.io. Nada de WebFinanzas ni MiBanda se modifica.

En iOS/iPadOS 16.4 o posterior: Safari → Compartir → Añadir a pantalla de inicio → abrir PWA → Google → Ajustes → Activar avisos. HTTPS, app instalada y permiso concedido mediante un gesto del usuario. Concentración, batería y red pueden retrasar o impedir avisos. Cerrar sesión no revoca por sí solo el registro de notificaciones del dispositivo.

Los eventos proceden de noticias de la edición diaria y se publican junto con ella cuando tienen fecha futura y enlace al anuncio oficial. Si el mismo evento vuelve a aparecer, su identificador permite actualizarlo. Los anuncios de software proceden de scripts/curated.json. La interfaz se almacena para abrir sin conexión. Recargar noticias requiere acceso a Firebase.

## Compartir y retomar la lectura

Cada noticia ofrece un botón discreto para compartir su enlace original. En móviles compatibles abre el menú del sistema; en el resto copia el enlace y, si el navegador bloquea el portapapeles, permite copiarlo manualmente. Cancelar el menú no copia ni envía nada.

TechAt7 conserva la sección, los filtros, las tarjetas ampliadas y la posición de lectura mientras la app sigue abierta. Una apertura nueva empieza arriba en Hoy. Los enlaces directos abren la edición indicada y Guardadas se sincroniza con Firebase.

## Categorías y preferencias

Cada noticia de `editions/AAAA-MM-DD.json` usa una categoría del catálogo de [src/categories.json](src/categories.json). El validador de `scripts/edition.mjs` rechaza categorías fuera de esa lista, que ahora incluye Apple, Android, Google, Microsoft, Inteligencia artificial, Tecnología, Lanzamientos, Hardware, Desarrollo, Web y privacidad, Seguridad, Ciencia, Videojuegos, Empresas, Movilidad, Criptomonedas, Regulación, Redes sociales, Startups, Cloud, Open source, Realidad virtual, Domótica, Audio y vídeo y Fotografía.

En **Ajustes → Categorías y cantidad** cada usuario busca y activa o desactiva los temas que quiere leer, puede seleccionar o quitar los resultados visibles y decide cuántas noticias ver por edición. Las preferencias (`categories` y `dailyLimit`) se guardan en `users/{uid}/preferences/radar` de Firestore, por lo que se sincronizan entre dispositivos con la misma cuenta. Si esas reglas todavía no están publicadas y Firestore responde `permission-denied`, la app guarda automáticamente las mismas preferencias en un documento reservado dentro de `users/{uid}/saved`, oculto en Guardadas, y vuelve a intentar la ruta principal en cada carga. `localStorage` actúa como caché y permite seguir usando la app sin conexión. La demo usa almacenamiento local independiente.

La selección se aplica a Hoy y Anteriores y el filtro «Todas» muestra únicamente las categorías activas. El límite de noticias se aplica a cada fecha después de filtrar por búsqueda y categorías: por defecto se muestran 15, con opciones de 3 a 20 y «Todas» para ver la edición completa. Guardadas no se filtra para no ocultar noticias que el usuario ya eligió conservar. El acceso directo «Categorías» junto a los filtros lleva a esa configuración.

La app sincroniza sola al abrirse, al volver del segundo plano, al recuperar la conexión y cada cinco minutos mientras está visible. El botón **Sincronizar** consulta el servidor al momento, muestra el estado («Al día», «Sincronizando…») y avisa con un banner cuando llega una edición nueva; el aviso también aparece como punto rojo en la pestaña Hoy. Las notificaciones push siguen siendo el aviso inmediato cuando la app está cerrada.
