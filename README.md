# CRM Tático de Alta Conversão

## 🎯 Visão de Produto (Product Owner / PM)
O **Lista de Vez** é um CRM tático mobile-first desenhado para operações de vendas em fila estruturada (Round-Robin). Focado em máxima eficiência e conversão, o sistema adota uma filosofia de "Invisible UI", substituindo cliques burocráticos por gestos fluidos e reativos. A meta é garantir que o vendedor foque 100% no cliente, não no preenchimento de formulários, enquanto os gestores recebem métricas absolutas em tempo real.

## 📊 Métricas Norteadoras (North Star Metrics)
1. **TKM (Ticket Médio)**: O valor médio fechado por venda.
2. **Faturamento Acumulado**: Total de receita real (Status: WON).
3. **Taxa de Conversão**: Percentual de fichas fechadas (WON) versus total (WON + LOST).
4. **Volume de Atendimentos**: Capacidade da operação no dia/período.

## 🏗️ Diagrama de Arquitetura & Governança (CTO / Arquiteto)

A aplicação segue rigorosamente as Leis Inegociáveis do Blueprint VAI:
- **UDF (Unidirectional Data Flow)**: O estado flui para baixo, eventos fluem para cima.
- **UI Burra**: Componentes React apenas refletem o estado e capturam gestos.
- **Isolamento de Domínio**: Regras de fila, Round-Robin e cálculos de TKM vivem na camada `domain`.
- **SSOT & Offline-First**: O estado da aplicação vive em um repositório centralizado, persistido via IndexedDB para tolerância 100% a falhas de rede.

```text
[ GUI (React/Tailwind) ] <--- (Props/State) --- [ MVI / ViewModels (Zustand) ]
       |                                                 |
   (Swipes/Events)                                  (Use Cases)
       |                                                 |
       v                                                 v
[ Intent Processors ] ---> [ Domain Layer (Core Logic / Round Robin) ]
                                                         |
                                                  (Read/Write)
                                                         |
                                                         v
                                          [ SSOT (IndexedDB + Sync Engine) ]
```

## 🛠️ Stack Tecnológica
- **Front-end**: React 19, TypeScript, Tailwind CSS (Design System / Tokens).
- **Gestos & Animação**: Motion (Framer Motion) para swipes fluidos.
- **Gerência de Estado**: Zustand (implementando MVI e SSOT).
- **Persistência**: IndexedDB (idb) / PWA / Offline-First.
- **Exportações**: Geração de Blob para CSV/XLSX/PDF no lado do cliente.

## 📜 Governança de Código
1. **Zero Fricção**: Todo código expõe sua intenção.
2. **Tipagem Estrita**: Nenhuma entidade transita sem contrato validado.
3. **Imutabilidade**: O estado anterior nunca é mutado, sempre re-criado.
