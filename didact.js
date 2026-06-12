// MISSAO 1: Funções Base do Elemento Virtual

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

function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)
  return dom;
}

// MISSAO 2: Loop de Trabalho Concorrente

let nextUnitOfWork = null
let wipRoot = null        // Árvore em progresso (Work in Progress)
let currentRoot = null    // Árvore que está atualmente renderizada no DOM
let deletions = null      // Array para acumular nós que devem ser removidos

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  // Quando não houver mais unidades de trabalho e tivermos uma árvore calculada,
  // avançamos para a Commit Phase de forma atómica.
  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    // Virá na Missão 4
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
  return undefined
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

// 3.1 The Commit Phase & Render Atualizado (Seu guia comentado ✏️)

// Inicializa a Render Phase: configura a raiz em progresso ligando-a ao DOM
function render(element, container) {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: currentRoot, // Aponta para a versão anterior da árvore
  }
  deletions = []            // Limpa a lista de remoções para este ciclo
  nextUnitOfWork = wipRoot  // Aciona o motor do scheduler
}

// Inicia a aplicação atómica das mudanças calculadas no DOM real
function commitRoot() {
  deletions.forEach(commitWork) // Executa a remoção dos nós obsoletos primeiro
  commitWork(wipRoot.child)     // Aplica inserções e atualizações a partir do primeiro filho
  currentRoot = wipRoot         // Guarda a árvore atualizada como referência estável
  wipRoot = null                // Limpa o rascunho de trabalho
}

// Percorre recursivamente a árvore aplicando as alterações baseadas nas etiquetas de efeito
function commitWork(fiber) {
  if (!fiber) return

  // Sobe na hierarquia para encontrar um nó com DOM válido (essencial para Missão 4)
  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // Aplica a mutação correta de acordo com a etiqueta gerada no Diffing
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent)
  }

  commitWork(fiber.child)   // Aplica nos filhos
  commitWork(fiber.sibling) // Aplica nos irmãos lateralmente
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

// 3.2 updateDom 

const isEvent     = key => key.startsWith("on")
const isProperty  = key => key !== "children" && !isEvent(key)
const isNew       = (prev, next) => key => prev[key] !== next[key]
const isGone      = (prev, next) => key => !(key in next)

function updateDom(dom, prevProps, nextProps) {
  // Caso 1: Remover listeners de eventos antigos que mudaram ou não existem mais
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Caso 2: Remover propriedades regulares antigas que sumiram nas novas props
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })

  // Caso 3: Definir propriedades regulares novas ou que mudaram de valor
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // Caso 4: Adicionar novos ouvintes de eventos para interatividade
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}


// 3.3 reconcileChildren - Algoritmo de Diffing 

function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null

    // Verifica se o nó anterior e o novo possuem exatamente a mesma tag HTML
    const sameType = oldFiber && element && element.type == oldFiber.type

    // Caso 1: Mesmo tipo -> Mantemos o nó DOM e apenas atualizamos as suas propriedades (UPDATE)
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom, // Recicla o nó DOM real!
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }

    // Caso 2: Novo elemento ou tipo diferente -> O DOM antigo não serve, cria um novo (PLACEMENT)
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }

    // Caso 3: Existe uma Fiber antiga mas o novo elemento sumiu ou mudou de tipo -> Remove do DOM (DELETION)
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber) // Adiciona à fila de destruição atómica
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}


// Teste de Renderização e Reconciliação da M3

const Didact = { createElement, render };
const container = document.getElementById("root");

function updateApp(title, description) {
  const element = Didact.createElement(
    "div",
    { style: "background: lightblue; padding: 20px; border-radius: 8px; max-width: 500px; margin: 40px auto; font-family: sans-serif;" },
    Didact.createElement("h1", null, title),
    Didact.createElement("p", null, description)
  );
  Didact.render(element, container);
}

// 1. Testa a renderização inicial na tela (PLACEMENT)
updateApp("Mission 3: Fiber Tree works! 🌳", "Wait 2 seconds for the update...");

// 2. Testa o Algoritmo de Diffing após 2 segundos (UPDATE)
setTimeout(() => {
  updateApp("Mission 3: Reconciliation works! 🔄", "The DOM was updated without recreating the wrapper div.");
}, 2000);