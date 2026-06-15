
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === "object" ? child : createTextElement(child)),
    },
  };
}

function createTextElement(text) {
  return { type: "TEXT_ELEMENT", props: { nodeValue: text, children: [] } };
}

function createDom(fiber) {
  const dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props);
  return dom;
}

let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
let deletions = null;
let wipFiber = null;
let hookIndex = null;

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) commitRoot();
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  if (fiber.child) return fiber.child;
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
}

function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber);
  reconcileChildren(fiber, fiber.props.children);
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function useState(initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = { state: oldHook ? oldHook.state : initial, queue: [] };
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => hook.state = action instanceof Function ? action(hook.state) : action);
  const setState = action => {
    hook.queue.push(action);
    wipRoot = { dom: currentRoot.dom, props: currentRoot.props, alternate: currentRoot };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };
  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function render(element, container) {
  wipRoot = { dom: container, props: { children: [element] }, alternate: currentRoot };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber) {
  if (!fiber) return;
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) domParentFiber = domParentFiber.parent;
  const domParent = domParentFiber.dom;
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) domParent.appendChild(fiber.dom);
  else if (fiber.effectTag === "UPDATE" && fiber.dom != null) updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  else if (fiber.effectTag === "DELETION") commitDeletion(fiber, domParent);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) domParent.removeChild(fiber.dom);
  else commitDeletion(fiber.child, domParent);
}

function updateDom(dom, prevProps, nextProps) {
  const isEvent = key => key.startsWith("on");
  const isProperty = key => key !== "children" && !isEvent(key);
  Object.keys(prevProps).filter(isEvent).filter(key => !(key in nextProps) || prevProps[key] !== nextProps[key]).forEach(name => dom.removeEventListener(name.toLowerCase().substring(2), prevProps[name]));
  Object.keys(prevProps).filter(isProperty).filter(key => !(key in nextProps)).forEach(name => dom[name] = "");
  Object.keys(nextProps).filter(isProperty).filter(key => prevProps[key] !== nextProps[key]).forEach(name => dom[name] = nextProps[name]);
  Object.keys(nextProps).filter(isEvent).filter(key => prevProps[key] !== nextProps[key]).forEach(name => dom.addEventListener(name.toLowerCase().substring(2), nextProps[name]));
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    const sameType = oldFiber && element && element.type == oldFiber.type;
    if (sameType) {
      newFiber = { type: oldFiber.type, props: element.props, dom: oldFiber.dom, parent: wipFiber, alternate: oldFiber, effectTag: "UPDATE" };
    }
    if (element && !sameType) {
      newFiber = { type: element.type, props: element.props, dom: null, parent: wipFiber, alternate: null, effectTag: "PLACEMENT" };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }
    if (oldFiber) oldFiber = oldFiber.sibling;
    if (index === 0) wipFiber.child = newFiber;
    else if (element) prevSibling.sibling = newFiber;
    prevSibling = newFiber;
    index++;
  }
}

const Didact = { createElement, render, useState };

