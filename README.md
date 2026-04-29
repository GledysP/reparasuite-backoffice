# 🖥️ ReparaSuite - Backoffice Administrativo

Este repositorio contiene el Frontend Administrativo de **ReparaSuite**, una Single Page Application (SPA) de alto rendimiento diseñada para la gestión operativa de talleres de reparación. Construida con **Angular 19** y **Angular Material** (estilizado con SCSS), ofrece una experiencia de usuario fluida, reactiva y orientada a la productividad.
<br>

## 📖 Vista General del Dashboard

*(Imagen general del Dashboard)*

<br>

## 🏗️ Flujo de Negocio y Componentes

El panel administrativo actúa como el centro de control del ecosistema. El diseño del negocio es "Client-Centric" (centrado en el cliente), permitiendo una trazabilidad total entre el cliente, sus equipos y su historial de órdenes de trabajo.
```mermaid
graph TD
    %% Autenticación
    A[Standalone Components] --> B(Auth Guard)
    B -->|Token JWT| C{Layout Principal}

    %% Portal Cliente (Origen externo)
    PC((Portal Cliente<br>PWA)) -.->|Crea Solicitud| T

    %% Flujo Core del Negocio
    subgraph Core [Operación Core]
        C2[Módulo Clientes] -->|Alta directa| O[Órdenes: Ejecución]
        C2 <-->|Dueño de| E[Módulo Equipos]
        T[Tickets: Pre-validación] -.->|Convierte a| O
        O <-->|Asocia| E
    end

    %% Otros Módulos
    C --> T
    C --> O
    C --> C2
    C --> I[Módulo Inventario]
    C --> U[Módulo Usuarios]
    C --> S[Ajustes del Taller]

    %% Capa de Datos y Red
    T & O & E & C2 & I & U & S --> G(Servicios RxJS)
    G -->|HTTP Interceptor| H[(Spring Boot API)]

    %% --- ESTILOS PROFESIONALES (DARK MODE COMPATIBLE) ---
    
    %% Colores base para nodos fijos
    style PC fill:#e1bee7,stroke:#8e24aa,stroke-width:2px,color:#000
    style A fill:#dd0031,stroke:#c3002f,stroke-width:2px,color:#fff
    style H fill:#6cb52d,stroke:#559423,stroke-width:2px,color:#fff
    style C fill:#161b22,stroke:#30363d,stroke-width:2px,color:#c9d1d9
    
    %% Reparar el contraste (Letras visibles)
    style B fill:#161b22,stroke:#30363d,stroke-width:2px,color:#c9d1d9
    style G fill:#161b22,stroke:#30363d,stroke-width:2px,color:#c9d1d9
    
    %% Borde punteado elegante para el Core
    style Core fill:none,stroke:#30363d,stroke-width:2px,stroke-dasharray: 5 5
    
    %% CLASE PARA LOS MÓDULOS (Borde Azul)
    classDef modulo fill:#161b22,stroke:#1f6feb,stroke-width:2px,color:#c9d1d9;
    class T,O,C2,E,I,U,S modulo;
```

🚦 Máquina de Estados (Ciclo de Vida)
La lógica de la interfaz está gobernada por transiciones estrictas de estado, representadas visualmente a continuación para proteger la integridad transaccional del sistema:

Fragmento de código
```mermaid
graph LR
    subgraph tickets [Ciclo de Tickets]
        direction LR
        T1([ABIERTO]) --> T2([EN_REVISION]) --> T3([CERRADO])
    end

    subgraph ordenes [Ciclo de Órdenes de Trabajo]
        direction LR
        O1([RECIBIDA]) --> O2([PRESUPUESTO]) --> O3([APROBADA]) --> O4([EN_CURSO]) --> O5([FINALIZADA]) --> O6([CERRADA])
    end
    
    %% Hacer invisibles los contenedores grises toscos
    style tickets fill:none,stroke:none
    style ordenes fill:none,stroke:none
    
    %% Estilo corporativo elegante (Dark Mode compatible)
    classDef estado fill:#161b22,stroke:#30363d,stroke-width:1px,color:#c9d1d9;
    classDef inicio fill:#161b22,stroke:#1f6feb,stroke-width:2px,color:#c9d1d9;
    
    %% Asignar los estilos
    class T2,T3,O2,O3,O4,O5,O6 estado;
    class T1,O1 inicio;
```
🚀 Características Principales (Features)
Trazabilidad 360° del Cliente: Vinculación relacional que permite visualizar en tiempo real todos los equipos pertenecientes a un cliente y su historial completo de servicios.

Creación Dual de OTs: Flexibilidad operativa con soporte para alta manual directa (clientes en mostrador) o conversión automatizada desde un Ticket (clientes del portal).

Detalle de OT Unificado: Interfaz que agrupa presupuesto, citas, control de pagos, chat en tiempo real, archivos adjuntos y timeline del historial.

Dashboard Operativo: Panel con indicadores clave, gráficas de distribución mensual y accesos rápidos a la operación diaria.

Modo Claro / Oscuro (Dark Mode): Soporte nativo para cambio de tema dinámico manipulando tokens de Material Design (MDC), garantizando accesibilidad y confort visual.

Estilos Arquitecturados (SCSS): Uso de preprocesadores SCSS para un código de estilos modular, mantenible y sin repeticiones.

🛠️ Stack Tecnológico
Framework: Angular 19 (Standalone Components).

Lenguaje: TypeScript.

Motor de Estilos: SCSS (Sass) avanzado con variables y Nesting.

Librería de UI: Angular Material + Material Design Components (MDC).

Gestión de Asincronía: RxJS Observables.

⚙️ Configuración del Entorno
Requisitos previos
Node.js (v18 o superior)

Angular CLI 19

Instalación rápida
Clonar: git clone https://github.com/GledysP/reparasuite-backoffice.git

Instalar dependencias: npm install

Configurar Entorno: Ajustar la URL de la API en src/environments/environment.ts.

Ejecutar: ng serve
