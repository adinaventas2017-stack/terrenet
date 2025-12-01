import { getSupabaseClient } from './auth.js';
import { setupMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', function() {
    setupMenu();
    const form = document.getElementById('registroForm');
    const mensaje = document.getElementById('mensaje');
    const submitBtn = form.querySelector('button[type="submit"]');

    function showMessage(text, type = 'info'){
        mensaje.textContent = text;
        mensaje.className = 'mensaje';
        mensaje.classList.remove('status-success','status-error','status-info');
        if(type === 'ok') mensaje.classList.add('status-success');
        else if(type === 'err') mensaje.classList.add('status-error');
        else mensaje.classList.add('status-info');
    }

    form.addEventListener('submit', async function(e){
        e.preventDefault();
        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="loader"></span> Registrando...';

        const nombre = form.nombre.value.trim();
        const apellido = form.apellido.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const link = form.link.value.trim() || null;
        const empresa = !!form.empresa.checked;

        if (!password || password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'err');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
            return;
        }

        try {
            const supabase = getSupabaseClient();

            // PASO 1: Crear usuario en auth.users
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password
            });

            if (authError) {
                showMessage('Error: ' + (authError.message || 'No se pudo registrar.'), 'err');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
                return;
            }

            const userId = authData.user.id;

            // PASO 2: Crear registro en tabla usuarios
            const { data: usuarioData, error: usuarioError } = await supabase
                .from('usuarios')
                .insert([{
                    id: userId,  // Mismo ID que auth.users
                    nombre,
                    apellido,
                    email,
                    link_verificacion: link,
                    empresa,
                    estado_verificacion: 'pendiente'
                }])
                .select();

            if (usuarioError) {
                // Si falla el insert, intentar eliminar el usuario de auth
                console.error('Error creando usuario en tabla:', usuarioError);
                showMessage('Error: ' + (usuarioError.message || 'No se pudo completar el registro.'), 'err');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
                return;
            }

            // Logout automático porque aún no está aprobado
            await supabase.auth.signOut();

            showMessage('✅ Registro enviado. Espera la verificación del administrador.', 'ok');
            form.reset();

        } catch(err) {
            console.error('Error:', err);
            showMessage('Error inesperado. Intenta de nuevo.', 'err');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });
});
