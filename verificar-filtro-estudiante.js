// Script para verificar el problema del filtro de clases
// Ejecutar en estudiante.html

async function verificarFiltroEstudiante() {
    try {
        console.log('🔍 Verificando filtro de clases para estudiantes...');

        // 1. Obtener usuario actual
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        console.log('👤 Usuario actual:', currentUser);
        console.log('📚 Programa del usuario:', currentUser?.programa);

        // 2. Cargar TODAS las clases (como hace loadClasesByModulo)
        const snapshot = await getDocs(collection(db, 'classes'));
        const allClases = [];
        snapshot.forEach(doc => {
            allClases.push({ id: doc.id, ...doc.data() });
        });

        console.log(`📊 Total de clases en BD: ${allClases.length}`);

        // 3. Aplicar filtro filterByUserAccess (como hace el sistema)
        const filteredByAccess = allClases.filter(item => {
            // Filtrar por programa
            const itemPrograma = (item.programa || '').toString().toLowerCase().trim();
            const userPrograma = (currentUser.programa || '').toString().toLowerCase().trim();

            if (!itemPrograma || itemPrograma !== userPrograma) {
                return false;
            }

            // Filtrar por combinaciones permitidas si existen
            if (item.combinacionesPermitidas && Array.isArray(item.combinacionesPermitidas) && item.combinacionesPermitidas.length > 0) {
                const userSede = (currentUser.sede || '').toString().trim();
                const userHorario = (currentUser.horario || '').toString().trim();

                const combinacionPermitida = item.combinacionesPermitidas.some(combo =>
                    combo.sede === userSede && combo.horario === userHorario
                );

                if (!combinacionPermitida) {
                    return false;
                }
            }

            return true;
        });

        console.log(`✅ Clases que pasan el filtro: ${filteredByAccess.length}`);

        // 4. Contar por programa
        const porPrograma = {};
        filteredByAccess.forEach(clase => {
            const prog = clase.programa || 'SIN PROGRAMA';
            porPrograma[prog] = (porPrograma[prog] || 0) + 1;
        });

        console.log('📂 Clases visibles por programa:', porPrograma);

        // 5. Verificar problema específico
        const clasesPanaderia = filteredByAccess.filter(c => c.programa === 'Panadería');
        const clasesBelleza = filteredByAccess.filter(c => c.programa === 'Belleza Integral');

        if (currentUser.programa === 'Belleza Integral' && clasesPanaderia.length > 0) {
            console.log('🚨 ERROR CRÍTICO: Usuario de Belleza ve clases de Panadería!');
            console.log('Clases de panadería visibles:', clasesPanaderia.map(c => c.titulo));
        }

        if (currentUser.programa === 'Panadería' && clasesBelleza.length > 0) {
            console.log('🚨 ERROR CRÍTICO: Usuario de Panadería ve clases de Belleza!');
            console.log('Clases de belleza visibles:', clasesBelleza.map(c => c.titulo));
        }

        // 6. Mostrar todas las clases visibles
        console.log('\n📋 LISTA COMPLETA DE CLASES VISIBLES:');
        filteredByAccess.forEach((clase, index) => {
            console.log(`${index + 1}. ${clase.titulo} (${clase.programa}) - Módulo: ${clase.modulo}`);
        });

        return {
            usuario: currentUser,
            totalClases: allClases.length,
            clasesVisibles: filteredByAccess.length,
            clasesPorPrograma: porPrograma,
            detalleClases: filteredByAccess
        };

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar
verificarFiltroEstudiante();