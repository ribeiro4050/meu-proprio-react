// =============================================================================
// 1.1 The createElement Function (Fornecida pelo enunciado)
// =============================================================================

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props, // Copia todas as propriedades originais (id, style, etc.)

      // Normalização: se o filho já for um objeto/elemento virtual, mantém.
      // Se for um texto ou número puro, envolve-o num nó virtual TEXT_ELEMENT.
      children: children.map(child =>
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT", // Tipo sentinela para sabermos que é texto bruto
    props: {
      nodeValue: text,    // Propriedade real do DOM para nós de texto
      children: [],       // Nós de texto nunca têm filhos
    },
  };
}


// 1.2 The render Function


function render(element, container) {
  // Passo 1: Se o tipo for "TEXT_ELEMENT", criamos um nó de texto nativo;
  // Caso contrário, criamos um elemento HTML normal usando o tipo (div, h1, p, etc.)
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  // Passo 2: Copiar todas as propriedades (props) do elemento virtual para o nó real,
  // exceto a lista especial de filhos "children".
  Object.keys(element.props)
    .filter(key => key !== "children")
    .forEach(name => {
      dom[name] = element.props[name];
    });

  // Passo 3: Chamar recursivamente a função render para cada um dos nós filhos,
  // injetando-os dentro do nó de DOM que acabámos de criar (o pai deles).
  element.props.children.forEach(child => 
    render(child, dom)
  );

  // Passo 4: Anexar o nó de DOM totalmente montado dentro do contentor receptor.
  container.appendChild(dom);
}


// Bloco de Teste da Missão 1

const Didact = { createElement, render };

// Como ainda não usamos JSX, escrevemos as chamadas aninhadas manualmente
const element = Didact.createElement(
  "div",
  { style: "background: salmon; padding: 20px; border-radius: 8px; color: white; max-width: 500px; margin: 40px auto; text-align: center;" },
  Didact.createElement("h1", null, "Mission 1: Success! 🎉"),
  Didact.createElement("p", null, "If you can see this, your DOM creation is working.")
);

const container = document.getElementById("root");
Didact.render(element, container);