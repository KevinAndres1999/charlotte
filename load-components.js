// Pequeño cargador de componentes HTML: busca elementos con `data-include="name"`
// y carga `components/name.html` para insertarlos.
(function(){
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  if(!nodes.length){ document.dispatchEvent(new Event('componentsLoaded')); return; }
  let loaded = 0;
  nodes.forEach(n=>{
    const name = n.dataset.include;
    fetch(`components/${name}.html`).then(r=>{
      if(!r.ok) throw new Error('No se encontró componente '+name);
      return r.text();
    }).then(html=>{
      n.innerHTML = html;
    }).catch(err=>{
      n.innerHTML = `<!-- Error cargando ${name}: ${err.message} -->`;
    }).finally(()=>{
      loaded++;
      if(loaded === nodes.length){
        // Dispatch para indicar que los componentes están listos
        document.dispatchEvent(new Event('componentsLoaded'));
      }
    });
  });
})();
