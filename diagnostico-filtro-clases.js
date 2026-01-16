// Script de diagnóstico para el problema de filtrado de clases
// Ejecutar en la consola del navegador en estudiante.html

async function diagnosticarFiltroClases() {
    try {
        console.log('🔍 DIAGNÓSTICO: Filtrado de clases por programa');

        // 1. Verificar usuario actual
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        console.log('👤 Usuario actual:', currentUser);
        console.log('📚 Programa del usuario:', currentUser?.programa);

        // 2. Cargar todas las clases
        console.log('\n📖 Cargando todas las clases...');
        const snapshot = await getDocs(collection(db, 'classes'));
        const allClases = [];
        snapshot.forEach(doc => {
            allClases.push({ id: doc.id, ...doc.data() });
        });

        console.log(`📊 Total de clases en BD: ${allClases.length}`);

        // 3. Analizar programas
        const programas = {};
        allClases.forEach(clase => {
            const programa = clase.programa || 'SIN PROGRAMA';
            if (!programas[programa]) {
                programas[programa] = [];
            }
            programas[programa].push({
                id: clase.id,
                titulo: clase.titulo,
                modulo: clase.modulo
            });
        });

        console.log('\n📂 Distribución por programas:');
        Object.keys(programas).forEach(programa => {
            console.log(`  ${programa}: ${programas[programa].length} clases`);
            if (programas[programa].length <= 5) {
                programas[programa].forEach(clase => {
                    console.log(`    - ${clase.titulo} (${clase.modulo})`);
                });
            } else {
                console.log(`    Primeras 3: ${programas[programa].slice(0, 3).map(c => c.titulo).join(', ')}`);
            }
        });

        // 4. Simular el filtro filterByUserAccess
        console.log('\n🔎 Simulando filtro filterByUserAccess...');

        if (!currentUser) {
            console.log('❌ No hay usuario actual');
            return;
        }

        const filtered = allClases.filter(item => {
            const itemPrograma = (item.programa || '').toString().toLowerCase().trim();
            const userPrograma = (currentUser.programa || '').toString().toLowerCase().trim();

            const match = itemPrograma === userPrograma;
            if (!match) {
                console.log(`❌ Clase "${item.titulo}" rechazada: programa "${itemPrograma}" != "${userPrograma}"`);
            }
            return match;
        });

        console.log(`\n✅ Clases que pasan el filtro: ${filtered.length} de ${allClases.length}`);

        // 5. Verificar si hay clases de panadería en el filtro
        const clasesPanaderia = filtered.filter(c => c.programa === 'Panadería');
        const clasesBelleza = filtered.filter(c => c.programa === 'Belleza Integral');

        console.log('\n🍞 Clases de Panadería en filtro:', clasesPanaderia.length);
        console.log('💄 Clases de Belleza en filtro:', clasesBelleza.length);

        if (clasesPanaderia.length > 0 && currentUser.programa === 'Belleza Integral') {
            console.log('🚨 ERROR: Usuario de Belleza ve clases de Panadería!');
            console.log('Clases de panadería visibles:', clasesPanaderia.map(c => c.titulo));
        }

        if (clasesBelleza.length > 0 && currentUser.programa === 'Panadería') {
            console.log('🚨 ERROR: Usuario de Panadería ve clases de Belleza!');
            console.log('Clases de belleza visibles:', clasesBelleza.map(c => c.titulo));
        }

        // 6. Verificar combinaciones permitidas
        console.log('\n🔐 Verificando combinaciones permitidas...');
        const clasesSinCombinaciones = allClases.filter(c => !c.combinacionesPermitidas || !Array.isArray(c.combinacionesPermitidas) || c.combinacionesPermitidas.length === 0);
        console.log(`Clases sin combinaciones permitidas: ${clasesSinCombinaciones.length}`);

        return {
            usuario: currentUser,
            totalClases: allClases.length,
            clasesFiltradas: filtered.length,
            programas: programas,
            clasesPanaderiaVisibles: clasesPanaderia,
            clasesBellezaVisibles: clasesBelleza
        };

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
}

// Ejecutar diagnóstico
diagnosticarFiltroClases();