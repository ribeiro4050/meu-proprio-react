// MISSAO 1: Funções já criadas e consolidadas

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

// A função render() antiga da Missão 1 foi desativada temporariamente.
// vamos reconstruí-la na Missão 3 utilizando Fibers
function render(element, container) {
  // Será reescrita na Missão 3
}

// MISSAO 2: Concurrency & Loop de Trabalho (Fornecido pelo enunciado)

let nextUnitOfWork = null

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    // Se faltar menos de 1ms de tempo livre, cede o controlo ao browser
    shouldYield = deadline.timeRemaining() < 1
  }

  // (A verificação do wipRoot e commitRoot será ativada na Missão 3)
  
  // Reagenda o loop para a próxima folga do navegador
  requestIdleCallback(workLoop)
}
// Dá a partida inicial no agendador do browser
requestIdleCallback(workLoop)

function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type)

  // (A função updateDom será criada na Missão 3, por enquanto criamos o nó limpo)
  return dom
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  // (A reconciliação completa virá na Missão 3, simulamos a criação básica dos filhos para o teste)
  if (fiber.props && fiber.props.children) {
    reconcileChildrenSimulado(fiber, fiber.props.children)
  }
}

// Auxiliar temporário apenas para manter a estrutura viva durante o teste da Missão 2
function reconcileChildrenSimulado(wipFiber, elements) {
  let prevSibling = null
  elements.forEach((element, index) => {
    const newFiber = {
      type: element.type,
      props: element.props,
      dom: null,
      parent: wipFiber,
    }
    if (index === 0) {
      wipFiber.child = newFiber
    } else {
      prevSibling.sibling = newFiber
    }
    prevSibling = newFiber
  })
}

// 2.3 performUnitOfWork

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    // (Apoio a componentes funcionais virá na Missão 4)
  } else {
    updateHostComponent(fiber)
  }

  //Retorna a próxima unidade de trabalho seguindo a ordem estrita:
  
  // 1. Se o nó atual tiver um filho (child), retorna o filho.
  if (fiber.child) {
    return fiber.child
  }

  // 2. Se não tiver filho, caminha lateralmente procurando por um irmão (sibling).
  // Se o nó não tiver irmão, sobe para o pai (parent) e procura pelo irmão do pai (tio).
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent // Sobe um nível na árvore
  }

  // 3. Se subirmos até à raiz e ninguém tiver mais irmãos, o trabalho terminou!
  return undefined
}

// 🧪 Test Your Progress (Teste de Travessia Oficial da Missão 2)

// 1. Criação de nós simulados (Árvore de Teste do Enunciado)
const fiberC = { type: "C", props: {} };
const fiberB = { type: "B", props: {}, child: fiberC };
const fiberD = { type: "D", props: {} };
const fiberA = { type: "A", props: {}, child: fiberB };

// 2. Vinculação manual de ponteiros de parentesco e irmandade
fiberC.parent = fiberB;
fiberB.parent = fiberA;
fiberD.parent = fiberA;
fiberB.sibling = fiberD;

// 3. Substituição temporária para monitorizar as visitas pelo terminal do browser
const originalUpdateHost = updateHostComponent;
updateHostComponent = (fiber) => { 
  console.log("Visiting node:", fiber.type); 
};

// 4. Execução manual do algoritmo de agendamento de Fibers
console.log("--- Starting Fiber Traversal Test ---");
let nextUnit = fiberA;
while (nextUnit) {
  nextUnit = performUnitOfWork(nextUnit);
}
console.log("--- Traversal Finished ---");

// Restaura as definições originais para as próximas missões
updateHostComponent = originalUpdateHost;