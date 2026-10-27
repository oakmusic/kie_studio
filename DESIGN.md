# KIE STUDIO — Creative Workbench & Precision Light

Guía de Diseño e Identidad Visual de Software. Especificación normativa para interfaces de escritorio profesional y web responsive.

---

## 1. Concepto Visual y Metáfora Física

**El Taller de Edición y Creación Audiovisual (The Creative Atelier / Studio Workbench).**

KIE STUDIO no es una landing page de marketing, ni un chatbot conversacional genérico, ni una consola oscura de hacker. Es un **instrumento de precisión para creadores multimedia** (diseñadores, cineastas, compositores sonoros y directores de arte) que ejecutan iteraciones repetitivas de generación local y en la nube.

- **Mesa de Trabajo Dividida:**
  - **Izquierda:** La *Caja de Herramientas* (Toolbox / Creation Form) de ancho calibrado (400–440px), optimizada para entrada de parámetros densa, rápida y sin fatiga.
  - **Derecha:** El *Lienzo y Galería de Inspección* (Canvas / Monitor), donde los resultados visuales y auditivos tienen la máxima superficie y contraste sin interferencias.
- **Luz Natural de Taller (*Precision Light*):** Rechazo explícito tanto al modo oscuro "cine" (que cansa la vista en jornadas de edición diurnas) como al papel crema editorial vintage (que falsea la percepción del color en imágenes generadas). El fondo es un gris técnico neutro y frío con sutil tinte azul de tinta.

---

## 2. Personalidad de Marca

| Atributo | Definición de Comportamiento | Manifestación en la Interfaz |
|----------|-----------------------------|------------------------------|
| **Precisa & Quirúrgica** | Cero ambigüedad en costos, estados y tiempos de ejecución. | Cifras tabulares (`tabular-nums`), temporizadores exactos en segundos, estimación de créditos por ejecución y validación preventiva según OpenAPI. |
| **Utilitaria & Silenciosa** | El cromo de la interfaz pasa a segundo plano; el protagonista es el contenido del usuario. | Acento cromático ≤10% del área visual. Bordes milimétricos nítidos (1px), sin sombras difusas ni brillos decorativos. |
| **Tangible & Mecánica** | La interfaz responde como un equipo de hardware analógico de alta gama (inspirado en consolas de masterización y hardware de diseño). | Transiciones mecánicas amortiguadas (≤150ms), micro-hundimiento al pulsar (`Pressable` con escala 0.98), interruptores mecánicos en lugar de botones gigantes. |
| **Respetuosa con el Flujo** | Nunca destruye trabajo ni bloquea al usuario sin alternativa. | Diálogos de confirmación de descarte solo cuando hay datos nuevos, restauración instantánea de parámetros desde el historial (`Reuse Settings`). |

---

## 3. Estrategia Cromática (Tokens OKLCH)

Paleta basada en el espacio de color uniforme perceptivo OKLCH. Hue de marca fundamental ≈ **210 (Cool Teal-Ink / Azul Tinta de Laboratorio)**.

### Tabla de Tokens Normativos

| Rol Semántico | Token CSS | Valor OKLCH | Equivalente Aprox. | Propósito y Contraste |
|---------------|-----------|-------------|--------------------|-----------------------|
| **Fondo Base** | `--bg` | `oklch(0.965 0.008 210)` | `#F1F5F7` | Base general del taller; descanso visual diurno. |
| **Superficie Panel** | `--surface` | `oklch(0.992 0.003 210)` | `#FAFCFD` | Paneles de formulario y galería; profundidad sutil. |
| **Superficie Elevada**| `--surface-raised`| `oklch(1 0 0)` | `#FFFFFF` | Inputs, tarjetas de resultado, modales y botones. |
| **Tinta / Texto Principal**| `--text` | `oklch(0.20 0.025 250)` | `#15202B` | Máxima legibilidad tipográfica (contraste >12:1). |
| **Tinta Muted / Secundaria**| `--text-muted` | `oklch(0.44 0.025 250)` | `#4B5868` | Metadatos y etiquetas; contraste garantizado ≥5.5:1. |
| **Acento Primario** | `--accent` | `oklch(0.48 0.12 210)` | `#0E7086` | Teal técnico de acción principal; no más del 10% del cromo. |
| **Acento Hover** | `--accent-hover` | `oklch(0.40 0.11 210)` | `#0A586A` | Estado hover en botones primarios y tabs activas. |
| **Acento Sutil** | `--accent-soft` | `oklch(0.48 0.12 210 / 0.10)` | `rgba(14,112,134,0.10)` | Fondos de selección, badges activos y chips de filtro. |
| **Texto Sobre Acento**| `--on-accent` | `oklch(0.99 0.005 210)` | `#FFFFFF` | Texto de alta claridad en botones primarios. |
| **Borde Funcional** | `--border` | `oklch(0.20 0.02 250 / 0.11)` | `rgba(21,32,43,0.11)` | Delimitación arquitectónica de 1px. |
| **Borde Enérgico** | `--border-strong` | `oklch(0.20 0.02 250 / 0.20)` | `rgba(21,32,43,0.20)` | Hover en inputs y bordes de paneles activos. |
| **Éxito** | `--success` | `oklch(0.55 0.14 155)` | `#15803D` | Tareas completadas y confirmaciones de guardado. |
| **Aviso** | `--warning` | `oklch(0.62 0.15 65)` | `#B45309` | Créditos bajos, estado de cola o advertencias. |
| **Peligro / Error** | `--danger` | `oklch(0.52 0.20 25)` | `#DC2626` | Fallos de generación, saldo insuficiente o borrado. |
| **Scrim Multimedia** | `--overlay` | `oklch(0.15 0.02 250 / 0.50)` | `rgba(15,22,30,0.50)` | Fondo de modales y etiquetas sobre video/foto. |

---

## 4. Tipografía y Jerarquía

Se utiliza la **pila nativa de sistema** para máximo rendimiento, fidelidad de renderizado subpíxel y coherencia con el sistema operativo de escritorio.

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
```

### Escala Tipográfica de Herramienta

| Nivel | Tamaño | Peso | Line-Height | Tracking | Uso |
|-------|--------|------|-------------|----------|-----|
| **Display / Shell** | `1.25rem` (20px) | 700 Bold | 1.2 | `-0.025em` | Logotipo `KIE STUDIO` en FloatingChrome. |
| **Sección / Sheet Title** | `1.0625rem` (17px) | 600 SemiBold | 1.25 | `-0.02em` | Título de Galería, cabeceras de Modal Sheets. |
| **Label de Control** | `0.8125rem` (13px) | 600 SemiBold | 1.3 | `-0.01em` | Etiquetas de formulario (`Prompt`, `Model`, `Resolution`). |
| **Cuerpo / Input** | `0.875rem` (14px) | 400 Regular | 1.45 | `0` | Textareas, inputs de texto, chats del agente. |
| **Botones & Tabs** | `0.8125rem` (13px) | 600 SemiBold | 1.2 | `0` | Pestañas de categoría, botones de acción. |
| **Metadatos Técnicos** | `0.75rem` (12px) | 500 Medium | 1.35 | `0` | **Piso mínimo absoluto.** Tiempos, créditos, tags de modelo. Debe incluir `font-variant-numeric: tabular-nums`. |

> [!IMPORTANT]
> **Piso Mínimo de 12px:** Queda prohibido el uso de tamaños `text-[9px]`, `text-[10px]` o `text-[11px]` en elementos con información funcional. Toda metadata, tiempo o chip debe tener como mínimo `0.75rem` (12px).

---

## 5. Espaciado, Densidad y Cuadrícula

- **Escala Base:** Múltiplos de 4px / 8px (`0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.5rem`).
- **Altura de Controles Táctiles/Puntero:**
  - Botón Primario (`Generate`): `min-height: 2.75rem` (44px).
  - Inputs y Selectores: `min-height: 2.375rem` (38px).
  - Botones Secundarios y Chips: `min-height: 2rem` (32px).
- **Estructura del Área de Creación:**
  - El formulario debe incluir un espaciado inferior de amortiguación (`padding-bottom: 7.5rem` / `120px`) para que el contenido jamás quede oculto bajo la barra fija de acción.

---

## 6. Tratamiento de Superficies, Bordes, Sombras y Radios

### Superficies Sólidas
- **Prohibición de Paneles de Vidrio:** Quedan eliminados los efectos `backdrop-filter: blur(...)` en paneles interiores, barras fijas o toolbars. Todas las superficies son sólidas (`var(--surface)` o `var(--surface-raised)`).
- **El desenfoque (*blur*) se reserva exclusivamente para:**
  1. El velo de oscurecimiento exterior (*scrim backdrop*) de las hojas modales (`SpringSheet`).

### Bordes y Sombras
- **Bordes:** 1px continuo con `var(--border)` en paneles inactivos; `var(--border-strong)` en hover.
- **Foco de Teclado:** Doble anillo exterior: `outline: 2px solid var(--accent); outline-offset: 2px;`.
- **Sombras:**
  - Panel / Tarjeta base: `box-shadow: 0 1px 2px oklch(0.2 0.02 250 / 0.05);` (luz cenital natural).
  - Elementos flotantes / Menús: `box-shadow: 0 8px 24px -4px oklch(0.2 0.02 250 / 0.10), 0 2px 6px -1px oklch(0.2 0.02 250 / 0.04);`.

### Radios de Esquina
- Controles pequeños (inputs, botones, chips): `6px` (`--radius-md`).
- Paneles maestros del workbench: `10px` (`--radius-xl`).
- Ventanas modales y sheets: `14px` (`--radius-2xl`).

---

## 7. Composición de Pantalla y Jerarquía de Acción

### Solución Arquitectónica del Botón de Generación (`Generate CTA`)
1. **Fondo Sólido e Inmune a Colisiones:** La barra inferior del formulario (`studio-sticky-cta`) debe ser un bloque estructural con fondo **opaco y sólido** (`var(--surface-raised)`), con un borde superior nítido de 1px (`border-t border-[var(--border)]`).
2. **Eliminación del Degradado Translúcido:** Queda terminantemente prohibido el degradado `linear-gradient` semitransparente que provocaba la superposición de textos del formulario con el botón de acción.
3. **Distribución del Botón:**
   - Línea superior: Nombre del modelo seleccionado a la izquierda + Estimación de créditos en tiempo real a la derecha.
   - Línea intermedia: Enlace de advertencia (*Needs review*) solo si hay campos incompletos.
   - Línea de acción: Selector de lote (`Batch ×1..×4`) integrado de forma compacta + Botón `Generate` con feedback visual de progreso.

### Desacoplamiento del Reproductor de Audio Flotante
- El `AudioPlayer` no debe superponerse al botón `Generate`.
- En escritorio, se ancla en la base de la columna derecha (Galería).
- En móvil, si está activo, añade un offset dinámico de seguridad a la interfaz para que ningún control interactivo quede inaccesible.

---

## 8. Tratamiento de Formularios y Componentes Específicos

### 1. Zona de Referencia Multimedia (`ReferenceUpload`)
- Debe disponer de un contenedor con borde punteado técnico que soporte **Drag & Drop nativo**:
  - Al arrastrar un archivo desde el sistema operativo, la zona se ilumina en `var(--accent-soft)` con borde acentuado.
  - Al soltar, muestra un spinner discreto con el nombre del archivo y genera la miniatura.
  - Cada miniatura incluye su botón para insertar la mención contextual (`@image1`, `@audio1`) en el prompt.

### 2. Interruptores Booleanos (`BooleanToggle`)
- Sustitución de los botones dobles gigantes (`false`/`true`) por un **Toggle Switch mecánico de precisión**:
  - Anchura compacta (36px × 20px), con deslizamiento ágil (60ms).
  - Etiqueta legible a la izquierda y estado semántico claro (`aria-checked`).

### 3. Barra de Herramientas del Prompt (`PromptToolbar`)
- El área de texto del prompt (`textarea`) incorpora en su pie interno una barra de utilidades integrada:
  - Botón directo "Optimizar con Grok" (con badge si hay modelo activo).
  - Menú desplegable directo "Fragmentos / Snippets".
  - Contador de caracteres en cifra tabular.

### 4. Selector de Modelos (`ModelSelect`)
- El panel desplegable de modelos debe montarse con scroll interior independiente y un `max-height: calc(100vh - 220px)`, evitando cualquier desbordamiento inferior fuera de la ventana.

---

## 9. Adaptaciones Responsive (Desktop, Tablet, Mobile)

```text
DESKTOP (≥1024px)
┌────────────────────────────────────────────────────────┐
│ Floating Chrome (Brand · Mode Toggle · Credits · Sett) │
├──────────────────────────┬─────────────────────────────┤
│ ToolBox (Create Form)    │ Canvas & Media Gallery      │
│ Width: 400–440px         │ Flexible: 1fr               │
│ Scroll independiente     │ Virtualized Grid (2–4 cols) │
│ Sticky CTA sólido        │ Audio Player Dock           │
└──────────────────────────┴─────────────────────────────┘

MOBILE (<1024px)
┌────────────────────────────────────────────────────────┐
│ Floating Chrome (Brand · Credits · Settings)          │
├────────────────────────────────────────────────────────┤
│ Workspace View [ Create | History (N) ] (Top Segment)  │
├────────────────────────────────────────────────────────┤
│ Active View Area (Full Height scrollable)              │
│ - Create: Tabs [Image | Video | Audio] -> Model -> Form│
│ - History: Gallery Grid (2 cols)                       │
├────────────────────────────────────────────────────────┤
│ Sticky Action Bar (Solo en pestaña Create)             │
└────────────────────────────────────────────────────────┘
```

- **Regla Mobile-First de Densidad:** En pantallas móviles no se apilan 3 selectores segmentados. El switch de modo `Studio / Agent` se traslada a la barra superior o menú secundario, liberando el espacio vertical para el trabajo creativo directo.

---

## 10. Reglas Absolutas y Anti-Patrones Prohibidos

1. ❌ **No al púrpura/neón "IA Mágica":** Prohibido el uso de gradientes morados (`#7C3AED` / `#EC4899`), estrellas brillantes o destellos de marketing.
2. ❌ **No al glassmorphism difuso:** Prohibidos los fondos semitransparentes que dificulten la lectura de textos técnicos.
3. ❌ **No a micro-textos inferiores a 12px:** Toda información relevante debe ser legible a simple vista.
4. ❌ **No a textos flotantes superpuestos:** La barra de acción debe tener fondo 100% opaco para aislar los campos del formulario.
5. ❌ **No a emojis como iconos de interfaz:** Todo glifo interactivo debe ser un SVG nítido y probado (Lucide Icons).
6. ❌ **No a cards anidadas:** No colocar tarjetas dentro de tarjetas; la delimitación de jerarquía se realiza mediante espaciado de cuadrícula y líneas de 1px (`divide-y`).
7. ❌ **No a saltos de maquetación por estados de carga:** Toda carga o skeleton debe reservar exactamente el espacio que ocupará el elemento final (CLS = 0).

---

## 11. Jerarquía de Conflictos de Diseño

En caso de contradicción entre especificaciones o sugerencias de herramientas, la prioridad obligatoria es:

1. **`DESIGN.md` (Este documento normativo)**
2. **`impeccable` (Criterios de calidad de producto y acabado)**
3. **`baseline-ui` (Fundamentos de accesibilidad y contraste WCAG AA)**
4. **`ui-ux-pro-max` (Buenas prácticas de diseño para software)**
5. **`emil-design-eng` (Física y temporización de micro-interacciones)**
