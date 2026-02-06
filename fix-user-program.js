// Script para corregir userProgram en proyectos guardados
// Ejecutar en la consola del navegador en estudiante.html

function fixUserPrograms() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!currentUser || !currentUser.programa) {
        console.log('No hay usuario actual o programa definido');
        return;
    }

    const programa = currentUser.programa.toLowerCase();
    let correctUserProgram = 'belleza'; // default

    if (programa.includes('panader') || programa.includes('pasteler') || programa.includes('panadería') || programa.includes('pastelería')) {
        correctUserProgram = 'panaderia';
    } else if (programa.includes('bellez') || programa.includes('estetic') || programa.includes('belleza')) {
        correctUserProgram = 'belleza';
    }

    console.log('Programa del usuario:', currentUser.programa);
    console.log('userProgram correcto:', correctUserProgram);

    // Establecer userProgram global inmediatamente
    if (typeof userProgram !== 'undefined') {
        userProgram = correctUserProgram;
        console.log('✅ Establecido userProgram global:', userProgram);
    }

    // Verificar localStorage
    const projectKey = `project_${currentUser.email}`;
    const saved = localStorage.getItem(projectKey);
    if (saved) {
        const progressData = JSON.parse(saved);
        console.log('userProgram en localStorage:', progressData.userProgram);

        if (progressData.userProgram !== correctUserProgram) {
            progressData.userProgram = correctUserProgram;
            localStorage.setItem(projectKey, JSON.stringify(progressData));
            console.log('✅ Corregido userProgram en localStorage');
        } else {
            console.log('✅ userProgram en localStorage ya es correcto');
        }
    }

    // Verificar Firebase si está disponible
    if (typeof db !== 'undefined' && db) {
        const docRef = doc(db, 'projects', currentUser.email);
        getDoc(docRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('userProgram en Firebase:', data.userProgram);

                if (data.userProgram !== correctUserProgram) {
                    setDoc(docRef, {
                        ...data,
                        userProgram: correctUserProgram
                    });
                    console.log('✅ Corregido userProgram en Firebase');
                } else {
                    console.log('✅ userProgram en Firebase ya es correcto');
                }
            }
        });
    }

    // Recargar la página para aplicar los cambios
    console.log('🔄 Recargando página para aplicar correcciones...');
    setTimeout(() => {
        location.reload();
    }, 2000);
}

fixUserPrograms();