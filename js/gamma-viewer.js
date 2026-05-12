/**
 * Gamma Viewer - Script para visualización interactiva de clases
 * Estilo de presentación tipo Gamma.app
 */

class GammaViewer {
    constructor() {
        this.currentSlide = 0;
        this.slides = [];
        this.claseData = null;
        this.isActive = false;
        this.container = null;
    }

    /**
     * Inicializar el visor Gamma con el contenido de una clase
     * @param {Object} claseData - Datos de la clase (titulo, contenido, etc.)
     */
    init(claseData) {
        this.claseData = claseData;
        this.currentSlide = 0;
        this.createContainer();
        this.parseContent();
        this.setupEventListeners();
        this.show();
    }

    /**
     * Crear el contenedor del visor
     */
    createContainer() {
        // Eliminar contenedor existente si existe
        const existing = document.getElementById('gammaViewer');
        if (existing) {
            existing.remove();
        }

        const container = document.createElement('div');
        container.id = 'gammaViewer';
        container.className = 'gamma-viewer';
        container.innerHTML = `
            <div class="gamma-viewer-header">
                <div class="gamma-viewer-title">
                    <i class="fas fa-presentation"></i>
                    <span id="gammaViewerTitleText">${this.claseData.titulo || 'Clase'}</span>
                </div>
                <div class="gamma-viewer-controls">
                    <button class="gamma-control-btn" onclick="gammaViewer.toggleFullscreen()">
                        <i class="fas fa-expand"></i>
                        <span>Pantalla completa</span>
                    </button>
                    <button class="gamma-control-btn" onclick="gammaViewer.downloadPDF()">
                        <i class="fas fa-download"></i>
                        <span>Descargar</span>
                    </button>
                    <button class="gamma-control-btn close" onclick="gammaViewer.close()">
                        <i class="fas fa-times"></i>
                        <span>Cerrar</span>
                    </button>
                </div>
            </div>
            
            <div class="gamma-slides-container">
                <div id="gammaSlidesWrapper"></div>
            </div>

            <div class="gamma-navigation">
                <button class="gamma-nav-btn" id="gammaPrevBtn" onclick="gammaViewer.prevSlide()">
                    <i class="fas fa-chevron-left"></i>
                </button>
                
                <div class="gamma-dots-container" id="gammaDotsContainer"></div>
                
                <div class="gamma-slide-counter">
                    <span id="gammaCurrentSlide">1</span> / <span id="gammaTotalSlides">1</span>
                </div>
                
                <button class="gamma-nav-btn" id="gammaNextBtn" onclick="gammaViewer.nextSlide()">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <div class="gamma-keyboard-hint">
                <div class="keyboard-shortcut">
                    <span class="key-badge">←</span>
                    <span>Anterior</span>
                </div>
                <div class="keyboard-shortcut">
                    <span class="key-badge">→</span>
                    <span>Siguiente</span>
                </div>
                <div class="keyboard-shortcut">
                    <span class="key-badge">ESC</span>
                    <span>Salir</span>
                </div>
                <div class="keyboard-shortcut">
                    <span class="key-badge">F</span>
                    <span>Pantalla completa</span>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        this.container = container;
    }

    /**
     * Parsear el contenido HTML y dividirlo en slides
     */
    parseContent() {
        const content = this.claseData.contenido || '';
        const wrapper = document.createElement('div');
        wrapper.innerHTML = content;

        // Slide de portada
        const titleSlide = document.createElement('div');
        titleSlide.className = 'gamma-slide';
        titleSlide.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; min-height: 60vh;">
                <h1 style="font-size: 3rem; margin-bottom: 1rem;">${this.claseData.titulo || 'Clase'}</h1>
                <p style="font-size: 1.3rem; color: #64748b; margin-bottom: 2rem;">${this.claseData.descripcion || ''}</p>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                    ${this.claseData.programa ? `<span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;"><i class="fas fa-graduation-cap"></i> ${this.claseData.programa}</span>` : ''}
                    ${this.claseData.modulo ? `<span style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;"><i class="fas fa-layer-group"></i> ${this.claseData.modulo}</span>` : ''}
                    ${this.claseData.duracion ? `<span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;"><i class="fas fa-clock"></i> ${this.claseData.duracion} min</span>` : ''}
                </div>
            </div>
        `;
        this.slides.push(titleSlide);

        // Detectar secciones principales (h2) para crear slides
        const h2Elements = wrapper.querySelectorAll('h2');
        
        if (h2Elements.length > 0) {
            // Dividir por h2
            h2Elements.forEach(h2 => {
                const slide = document.createElement('div');
                slide.className = 'gamma-slide';
                
                // Agregar barra de progreso
                const progressBar = document.createElement('div');
                progressBar.className = 'gamma-progress-bar';
                slide.appendChild(progressBar);

                // Agregar el h2
                slide.appendChild(h2.cloneNode(true));

                // Agregar todo el contenido hasta el siguiente h2
                let nextElement = h2.nextElementSibling;
                while (nextElement && nextElement.tagName !== 'H2') {
                    // Si es un h3, podemos crear subsecciones visuales
                    const clonedElement = nextElement.cloneNode(true);
                    
                    // Aplicar estilos especiales a secciones conocidas
                    if (h2.textContent.includes('ANTICIPACIÓN') || h2.textContent.includes('Anticipación')) {
                        if (!slide.querySelector('.gamma-section-anticipacion')) {
                            slide.querySelector('h2').style.color = '#f59e0b';
                        }
                    } else if (h2.textContent.includes('CONSTRUCCIÓN') || h2.textContent.includes('Construcción')) {
                        if (!slide.querySelector('.gamma-section-construccion')) {
                            slide.querySelector('h2').style.color = '#3b82f6';
                        }
                    } else if (h2.textContent.includes('CONSOLIDACIÓN') || h2.textContent.includes('Consolidación')) {
                        if (!slide.querySelector('.gamma-section-consolidacion')) {
                            slide.querySelector('h2').style.color = '#10b981';
                        }
                    }

                    slide.appendChild(clonedElement);
                    nextElement = nextElement.nextElementSibling;
                }

                this.slides.push(slide);
            });
        } else {
            // Si no hay h2, dividir por h3 o crear slides por contenido
            const h3Elements = wrapper.querySelectorAll('h3');
            if (h3Elements.length > 0) {
                h3Elements.forEach(h3 => {
                    const slide = document.createElement('div');
                    slide.className = 'gamma-slide';
                    
                    const progressBar = document.createElement('div');
                    progressBar.className = 'gamma-progress-bar';
                    slide.appendChild(progressBar);

                    slide.appendChild(h3.cloneNode(true));

                    let nextElement = h3.nextElementSibling;
                    while (nextElement && nextElement.tagName !== 'H3' && nextElement.tagName !== 'H2') {
                        slide.appendChild(nextElement.cloneNode(true));
                        nextElement = nextElement.nextElementSibling;
                    }

                    this.slides.push(slide);
                });
            } else {
                // Contenido simple, crear un solo slide con todo el contenido
                const slide = document.createElement('div');
                slide.className = 'gamma-slide';
                
                const progressBar = document.createElement('div');
                progressBar.className = 'gamma-progress-bar';
                slide.appendChild(progressBar);

                slide.innerHTML += content;
                this.slides.push(slide);
            }
        }

        // Renderizar slides
        const slidesWrapper = document.getElementById('gammaSlidesWrapper');
        this.slides.forEach((slide, index) => {
            slide.dataset.slideIndex = index;
            if (index === 0) {
                slide.classList.add('active');
            }
            slidesWrapper.appendChild(slide);
        });

        // Actualizar contador
        document.getElementById('gammaTotalSlides').textContent = this.slides.length;

        // Crear dots
        this.createDots();
    }

    /**
     * Crear indicadores de slides (dots)
     */
    createDots() {
        const dotsContainer = document.getElementById('gammaDotsContainer');
        dotsContainer.innerHTML = '';

        // Limitar dots a máximo 10 para no saturar
        const maxDots = Math.min(this.slides.length, 10);
        const dotInterval = Math.ceil(this.slides.length / maxDots);

        for (let i = 0; i < this.slides.length; i += dotInterval) {
            const dot = document.createElement('div');
            dot.className = 'gamma-dot';
            dot.dataset.slideIndex = i;
            if (i === 0) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => this.goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Teclado
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Touch para móviles
        let touchStartX = 0;
        let touchEndX = 0;

        this.container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        this.container.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });
    }

    /**
     * Manejar eventos de teclado
     */
    handleKeyboard(e) {
        if (!this.isActive) return;

        switch(e.key) {
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.prevSlide();
                break;
            case 'Escape':
                e.preventDefault();
                this.close();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToSlide(this.slides.length - 1);
                break;
        }
    }

    /**
     * Manejar gestos de swipe
     */
    handleSwipe(startX, endX) {
        const threshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }

    /**
     * Mostrar el visor
     */
    show() {
        this.container.classList.add('active');
        this.isActive = true;
        this.updateSlide();
        document.body.style.overflow = 'hidden';
    }

    /**
     * Cerrar el visor
     */
    close() {
        this.container.classList.remove('active');
        this.isActive = false;
        document.body.style.overflow = '';
        
        // Opcional: remover el contenedor después de la animación
        setTimeout(() => {
            if (this.container) {
                this.container.remove();
            }
        }, 300);
    }

    /**
     * Siguiente slide
     */
    nextSlide() {
        if (this.currentSlide < this.slides.length - 1) {
            this.currentSlide++;
            this.updateSlide();
        }
    }

    /**
     * Slide anterior
     */
    prevSlide() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateSlide();
        }
    }

    /**
     * Ir a un slide específico
     */
    goToSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.currentSlide = index;
            this.updateSlide();
        }
    }

    /**
     * Actualizar visualización del slide actual
     */
    updateSlide() {
        // Actualizar clases de slides
        this.slides.forEach((slide, index) => {
            slide.classList.remove('active', 'exiting');
            if (index === this.currentSlide) {
                slide.classList.add('active');
            }
        });

        // Actualizar contador
        document.getElementById('gammaCurrentSlide').textContent = this.currentSlide + 1;

        // Actualizar botones
        document.getElementById('gammaPrevBtn').disabled = this.currentSlide === 0;
        document.getElementById('gammaNextBtn').disabled = this.currentSlide === this.slides.length - 1;

        // Actualizar dots
        const dots = document.querySelectorAll('.gamma-dot');
        dots.forEach(dot => {
            const dotIndex = parseInt(dot.dataset.slideIndex);
            if (dotIndex === this.currentSlide || 
                (this.currentSlide > dotIndex && 
                 (!dot.nextElementSibling || parseInt(dot.nextElementSibling.dataset.slideIndex) > this.currentSlide))) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Actualizar barra de progreso
        const progress = ((this.currentSlide + 1) / this.slides.length) * 100;
        const progressBars = document.querySelectorAll('.gamma-progress-bar');
        progressBars.forEach(bar => {
            bar.style.width = progress + '%';
        });

        // Scroll al inicio del slide
        const activeSlide = this.slides[this.currentSlide];
        if (activeSlide) {
            activeSlide.scrollTop = 0;
        }
    }

    /**
     * Toggle pantalla completa
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen().catch(err => {
                console.error('Error al entrar en pantalla completa:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Descargar como PDF (placeholder - requiere librería adicional)
     */
    downloadPDF() {
        alert('La función de descarga PDF estará disponible próximamente. Por ahora puedes usar Ctrl+P para imprimir.');
        // TODO: Implementar con jsPDF o similar
    }
}

// Crear instancia global
window.gammaViewer = new GammaViewer();

/**
 * Función auxiliar para abrir una clase en vista Gamma
 * @param {Object} claseData - Datos de la clase
 */
window.openGammaView = function(claseData) {
    window.gammaViewer.init(claseData);
};

console.log('✅ Gamma Viewer cargado');
