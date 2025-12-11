# Script para generar admin.html optimizado
$html = Get-Content "C:\workspace\admin.html" -Raw

# Agregar el cuerpo HTML
$bodyHTML = @"
<body>
    <header class="admin-header">
        <div class="container">
            <h1><i class="fas fa-user-shield"></i> Panel Administrador</h1>
            <button class="mobile-menu-toggle" onclick="toggleMobileMenu()"><i class="fas fa-bars"></i></button>
            <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
        </div>
    </header>
    <div class="dashboard-container">
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h3>Admin Charlotte</h3>
                <p>Gestión de Contenidos</p>
            </div>
            <div class="nav-menu">
                <div class="nav-item active" onclick="showSection('dashboard')"><i class="fas fa-chart-line"></i><span>Dashboard</span></div>
                <div class="nav-item" onclick="showSection('videos')"><i class="fas fa-video"></i><span>Subir Videos</span></div>
                <div class="nav-item" onclick="showSection('clases')"><i class="fas fa-book-open"></i><span>Subir Clases</span></div>
                <div class="nav-item" onclick="showSection('actividades')"><i class="fas fa-tasks"></i><span>Subir Actividades</span></div>
                <div class="nav-item" onclick="showSection('cuestionarios')"><i class="fas fa-file-alt"></i><span>Subir Cuestionarios</span></div>
                <div class="nav-item" onclick="showSection('materiales')"><i class="fas fa-folder-open"></i><span>Subir Materiales</span></div>
            </div>
        </div>
        <div class="main-content">
            <div id="dashboard" class="content-section active">
                <div class="page-header"><h2>Dashboard</h2><p>Resumen de contenidos publicados</p></div>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-card-header"><div><h3 class="stat-value" id="stat-videos">0</h3><p class="stat-label">Videos Publicados</p></div><div class="stat-card-icon blue"><i class="fas fa-video"></i></div></div></div>
                    <div class="stat-card"><div class="stat-card-header"><div><h3 class="stat-value" id="stat-clases">0</h3><p class="stat-label">Clases Subidas</p></div><div class="stat-card-icon green"><i class="fas fa-book-open"></i></div></div></div>
                    <div class="stat-card"><div class="stat-card-header"><div><h3 class="stat-value" id="stat-actividades">0</h3><p class="stat-label">Actividades Creadas</p></div><div class="stat-card-icon purple"><i class="fas fa-tasks"></i></div></div></div>
                    <div class="stat-card"><div class="stat-card-header"><div><h3 class="stat-value" id="stat-materiales">0</h3><p class="stat-label">Materiales Adicionales</p></div><div class="stat-card-icon orange"><i class="fas fa-folder-open"></i></div></div></div>
                </div>
            </div>
            <div id="videos" class="content-section">
                <div class="page-header"><h2>Gestión de Videos</h2><p>Sube y administra videos para tus estudiantes</p></div>
                <div class="upload-card">
                    <h3><i class="fas fa-cloud-upload-alt"></i> Subir Nuevo Video</h3>
                    <form id="form-video" onsubmit="saveVideo(event)">
                        <div class="form-group"><label>Título del Video *</label><input type="text" name="titulo" required placeholder="Ej: Introducción a la Panadería"></div>
                        <div class="form-group"><label>Descripción</label><textarea name="descripcion" placeholder="Describe el contenido del video..."></textarea></div>
                        <div class="form-group"><label>URL del Video (YouTube, Vimeo, etc.) *</label><input type="url" name="url" required placeholder="https://youtube.com/watch?v=..."></div>
                        <div class="form-group"><label>Programa *</label><select name="programa" required><option value="">Selecciona un programa</option><option value="Panadería">Panadería y Repostería</option><option value="Belleza">Belleza y Cosmetología</option><option value="Todos">Todos los programas</option></select></div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Video</button>
                    </form>
                </div>
                <div class="content-list"><div class="content-list-header"><h4>Videos Publicados</h4></div><div id="videos-list"></div></div>
            </div>
            <div id="clases" class="content-section">
                <div class="page-header"><h2>Gestión de Clases</h2><p>Crea y publica material de clases</p></div>
                <div class="upload-card">
                    <h3><i class="fas fa-cloud-upload-alt"></i> Subir Nueva Clase</h3>
                    <form id="form-clase" onsubmit="saveClase(event)">
                        <div class="form-group"><label>Título de la Clase *</label><input type="text" name="titulo" required placeholder="Ej: Técnicas de Amasado"></div>
                        <div class="form-group"><label>Contenido *</label><textarea name="contenido" required placeholder="Escribe el contenido de la clase..."></textarea></div>
                        <div class="form-group"><label>Programa *</label><select name="programa" required><option value="">Selecciona un programa</option><option value="Panadería">Panadería y Repostería</option><option value="Belleza">Belleza y Cosmetología</option><option value="Todos">Todos los programas</option></select></div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Clase</button>
                    </form>
                </div>
                <div class="content-list"><div class="content-list-header"><h4>Clases Publicadas</h4></div><div id="clases-list"></div></div>
            </div>
            <div id="actividades" class="content-section">
                <div class="page-header"><h2>Gestión de Actividades</h2><p>Crea actividades y tareas para los estudiantes</p></div>
                <div class="upload-card">
                    <h3><i class="fas fa-cloud-upload-alt"></i> Crear Nueva Actividad</h3>
                    <form id="form-actividad" onsubmit="saveActividad(event)">
                        <div class="form-group"><label>Título de la Actividad *</label><input type="text" name="titulo" required placeholder="Ej: Práctica de Pan Francés"></div>
                        <div class="form-group"><label>Instrucciones *</label><textarea name="instrucciones" required placeholder="Describe las instrucciones de la actividad..."></textarea></div>
                        <div class="form-group"><label>Fecha de Entrega</label><input type="date" name="fecha"></div>
                        <div class="form-group"><label>Programa *</label><select name="programa" required><option value="">Selecciona un programa</option><option value="Panadería">Panadería y Repostería</option><option value="Belleza">Belleza y Cosmetología</option><option value="Todos">Todos los programas</option></select></div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Crear Actividad</button>
                    </form>
                </div>
                <div class="content-list"><div class="content-list-header"><h4>Actividades Creadas</h4></div><div id="actividades-list"></div></div>
            </div>
            <div id="cuestionarios" class="content-section">
                <div class="page-header"><h2>Gestión de Cuestionarios</h2><p>Sube cuestionarios y evaluaciones</p></div>
                <div class="upload-card">
                    <h3><i class="fas fa-cloud-upload-alt"></i> Subir Nuevo Cuestionario</h3>
                    <form id="form-cuestionario" onsubmit="saveCuestionario(event)">
                        <div class="form-group"><label>Título del Cuestionario *</label><input type="text" name="titulo" required placeholder="Ej: Evaluación Final Panadería"></div>
                        <div class="form-group"><label>Descripción</label><textarea name="descripcion" placeholder="Describe el cuestionario..."></textarea></div>
                        <div class="form-group"><label>Programa *</label><select name="programa" required><option value="">Selecciona un programa</option><option value="Panadería">Panadería y Repostería</option><option value="Belleza">Belleza y Cosmetología</option><option value="Todos">Todos los programas</option></select></div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Cuestionario</button>
                    </form>
                </div>
                <div class="content-list"><div class="content-list-header"><h4>Cuestionarios Publicados</h4></div><div id="cuestionarios-list"></div></div>
            </div>
            <div id="materiales" class="content-section">
                <div class="page-header"><h2>Gestión de Materiales</h2><p>Sube materiales adicionales de estudio</p></div>
                <div class="upload-card">
                    <h3><i class="fas fa-cloud-upload-alt"></i> Subir Nuevo Material</h3>
                    <form id="form-material" onsubmit="saveMaterial(event)">
                        <div class="form-group"><label>Nombre del Material *</label><input type="text" name="titulo" required placeholder="Ej: Tabla de Equivalencias"></div>
                        <div class="form-group"><label>Descripción</label><textarea name="descripcion" placeholder="Describe el material..."></textarea></div>
                        <div class="form-group"><label>URL o Enlace *</label><input type="text" name="url" placeholder="URL del archivo o enlace" required></div>
                        <div class="form-group"><label>Programa *</label><select name="programa" required><option value="">Selecciona un programa</option><option value="Panadería">Panadería y Repostería</option><option value="Belleza">Belleza y Cosmetología</option><option value="Todos">Todos los programas</option></select></div>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar Material</button>
                    </form>
                </div>
                <div class="content-list"><div class="content-list-header"><h4>Materiales Publicados</h4></div><div id="materiales-list"></div></div>
            </div>
        </div>
    </div>
    <script>
const currentUser=JSON.parse(sessionStorage.getItem('currentUser')||'null');if(!currentUser||currentUser.role!=='admin'){window.location.href='login.html';}
function showSection(sectionId){document.querySelectorAll('.content-section').forEach(s=>s.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.getElementById(sectionId).classList.add('active');event.target.closest('.nav-item').classList.add('active');if(window.innerWidth<=768){document.getElementById('sidebar').classList.remove('open');}loadContent(sectionId);}
function toggleMobileMenu(){document.getElementById('sidebar').classList.toggle('open');}
function logout(){sessionStorage.removeItem('currentUser');window.location.href='index.html';}
function saveVideo(e){e.preventDefault();const formData=new FormData(e.target);const video={id:Date.now(),titulo:formData.get('titulo'),descripcion:formData.get('descripcion'),url:formData.get('url'),programa:formData.get('programa'),fecha:new Date().toLocaleDateString()};const videos=JSON.parse(localStorage.getItem('videos')||'[]');videos.push(video);localStorage.setItem('videos',JSON.stringify(videos));e.target.reset();loadVideos();updateStats();showAlert('Video guardado exitosamente');}
function saveClase(e){e.preventDefault();const formData=new FormData(e.target);const clase={id:Date.now(),titulo:formData.get('titulo'),contenido:formData.get('contenido'),programa:formData.get('programa'),fecha:new Date().toLocaleDateString()};const clases=JSON.parse(localStorage.getItem('clases')||'[]');clases.push(clase);localStorage.setItem('clases',JSON.stringify(clases));e.target.reset();loadClases();updateStats();showAlert('Clase guardada exitosamente');}
function saveActividad(e){e.preventDefault();const formData=new FormData(e.target);const actividad={id:Date.now(),titulo:formData.get('titulo'),instrucciones:formData.get('instrucciones'),fecha:formData.get('fecha'),programa:formData.get('programa'),fechaCreacion:new Date().toLocaleDateString()};const actividades=JSON.parse(localStorage.getItem('actividades')||'[]');actividades.push(actividad);localStorage.setItem('actividades',JSON.stringify(actividades));e.target.reset();loadActividades();updateStats();showAlert('Actividad creada exitosamente');}
function saveCuestionario(e){e.preventDefault();const formData=new FormData(e.target);const cuestionario={id:Date.now(),titulo:formData.get('titulo'),descripcion:formData.get('descripcion'),programa:formData.get('programa'),fecha:new Date().toLocaleDateString()};const cuestionarios=JSON.parse(localStorage.getItem('cuestionarios')||'[]');cuestionarios.push(cuestionario);localStorage.setItem('cuestionarios',JSON.stringify(cuestionarios));e.target.reset();loadCuestionarios();updateStats();showAlert('Cuestionario guardado exitosamente');}
function saveMaterial(e){e.preventDefault();const formData=new FormData(e.target);const material={id:Date.now(),titulo:formData.get('titulo'),descripcion:formData.get('descripcion'),url:formData.get('url'),programa:formData.get('programa'),fecha:new Date().toLocaleDateString()};const materiales=JSON.parse(localStorage.getItem('materiales')||'[]');materiales.push(material);localStorage.setItem('materiales',JSON.stringify(materiales));e.target.reset();loadMateriales();updateStats();showAlert('Material guardado exitosamente');}
function deleteItem(type,id){if(confirm('¿Estás seguro de eliminar este elemento?')){const items=JSON.parse(localStorage.getItem(type)||'[]');const filtered=items.filter(item=>item.id!==id);localStorage.setItem(type,JSON.stringify(filtered));loadContent(type);updateStats();showAlert('Elemento eliminado exitosamente');}}
function loadContent(section){switch(section){case 'videos':loadVideos();break;case 'clases':loadClases();break;case 'actividades':loadActividades();break;case 'cuestionarios':loadCuestionarios();break;case 'materiales':loadMateriales();break;case 'dashboard':updateStats();break;}}
function loadVideos(){const videos=JSON.parse(localStorage.getItem('videos')||'[]');const container=document.getElementById('videos-list');if(videos.length===0){container.innerHTML='<div class="content-item"><div class="content-info"><h5>No hay videos publicados</h5><p>Los videos que subas aparecerán aquí</p></div></div>';return;}container.innerHTML=videos.map(video=>`<div class="content-item"><div class="content-info"><h5>${video.titulo}</h5><p>${video.descripcion||'Sin descripción'} • ${video.programa} • ${video.fecha}</p></div><div class="content-actions"><button class="btn-icon btn-delete" onclick="deleteItem('videos',${video.id})"><i class="fas fa-trash"></i></button></div></div>`).join('');}
function loadClases(){const clases=JSON.parse(localStorage.getItem('clases')||'[]');const container=document.getElementById('clases-list');if(clases.length===0){container.innerHTML='<div class="content-item"><div class="content-info"><h5>No hay clases publicadas</h5><p>Las clases que subas aparecerán aquí</p></div></div>';return;}container.innerHTML=clases.map(clase=>`<div class="content-item"><div class="content-info"><h5>${clase.titulo}</h5><p>${clase.programa} • ${clase.fecha}</p></div><div class="content-actions"><button class="btn-icon btn-delete" onclick="deleteItem('clases',${clase.id})"><i class="fas fa-trash"></i></button></div></div>`).join('');}
function loadActividades(){const actividades=JSON.parse(localStorage.getItem('actividades')||'[]');const container=document.getElementById('actividades-list');if(actividades.length===0){container.innerHTML='<div class="content-item"><div class="content-info"><h5>No hay actividades creadas</h5><p>Las actividades que crees aparecerán aquí</p></div></div>';return;}container.innerHTML=actividades.map(actividad=>`<div class="content-item"><div class="content-info"><h5>${actividad.titulo}</h5><p>${actividad.programa} • Entrega: ${actividad.fecha||'Sin fecha'} • Creada: ${actividad.fechaCreacion}</p></div><div class="content-actions"><button class="btn-icon btn-delete" onclick="deleteItem('actividades',${actividad.id})"><i class="fas fa-trash"></i></button></div></div>`).join('');}
function loadCuestionarios(){const cuestionarios=JSON.parse(localStorage.getItem('cuestionarios')||'[]');const container=document.getElementById('cuestionarios-list');if(cuestionarios.length===0){container.innerHTML='<div class="content-item"><div class="content-info"><h5>No hay cuestionarios publicados</h5><p>Los cuestionarios que subas aparecerán aquí</p></div></div>';return;}container.innerHTML=cuestionarios.map(cuestionario=>`<div class="content-item"><div class="content-info"><h5>${cuestionario.titulo}</h5><p>${cuestionario.descripcion||'Sin descripción'} • ${cuestionario.programa} • ${cuestionario.fecha}</p></div><div class="content-actions"><button class="btn-icon btn-delete" onclick="deleteItem('cuestionarios',${cuestionario.id})"><i class="fas fa-trash"></i></button></div></div>`).join('');}
function loadMateriales(){const materiales=JSON.parse(localStorage.getItem('materiales')||'[]');const container=document.getElementById('materiales-list');if(materiales.length===0){container.innerHTML='<div class="content-item"><div class="content-info"><h5>No hay materiales publicados</h5><p>Los materiales que subas aparecerán aquí</p></div></div>';return;}container.innerHTML=materiales.map(material=>`<div class="content-item"><div class="content-info"><h5>${material.titulo}</h5><p>${material.descripcion||'Sin descripción'} • ${material.programa} • ${material.fecha}</p></div><div class="content-actions"><button class="btn-icon btn-delete" onclick="deleteItem('materiales',${material.id})"><i class="fas fa-trash"></i></button></div></div>`).join('');}
function updateStats(){document.getElementById('stat-videos').textContent=JSON.parse(localStorage.getItem('videos')||'[]').length;document.getElementById('stat-clases').textContent=JSON.parse(localStorage.getItem('clases')||'[]').length;document.getElementById('stat-actividades').textContent=JSON.parse(localStorage.getItem('actividades')||'[]').length;document.getElementById('stat-materiales').textContent=JSON.parse(localStorage.getItem('materiales')||'[]').length;}
function showAlert(message){const alertDiv=document.createElement('div');alertDiv.className='alert alert-success';alertDiv.innerHTML=`<i class="fas fa-check-circle"></i><div>${message}</div>`;alertDiv.style.position='fixed';alertDiv.style.top='80px';alertDiv.style.right='20px';alertDiv.style.zIndex='1000';alertDiv.style.minWidth='300px';document.body.appendChild(alertDiv);setTimeout(()=>alertDiv.remove(),3000);}
updateStats();
    </script>
</body>
</html>
"@

$fullHTML = $html + $bodyHTML
$fullHTML | Out-File -FilePath "C:\workspace\admin.html" -Encoding UTF8
Write-Host "✅ admin.html completo generado!" -ForegroundColor Green
