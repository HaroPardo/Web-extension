window.addEventListener("message", (event) => {
  if (event.data.direction === "from-background") {
    // Reenviar al panel
    window.parent.postMessage(event.data, "*");
  }
});

// Informar que el puente está listo
window.parent.postMessage({direction: "bridge-ready"}, "*");