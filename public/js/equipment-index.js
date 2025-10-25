// Функции для страницы списка оборудования
document.addEventListener('DOMContentLoaded', function() {
    let equipmentIdToDelete = null;
    let equipmentIdToMove = null;
    
    // Обработка удаления оборудования
    document.querySelectorAll('.delete-equipment').forEach(button => {
        button.addEventListener('click', function() {
            equipmentIdToDelete = this.getAttribute('data-id');
            const equipmentName = this.getAttribute('data-name');
            document.getElementById('equipmentName').textContent = equipmentName;
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        });
    });
    
    // Подтверждение удаления
    document.getElementById('confirmDelete')?.addEventListener('click', function() {
        if (equipmentIdToDelete) {
            fetch(`/equipment/delete/${equipmentIdToDelete}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Ошибка: ' + data.message);
                    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при удалении');
            });
        }
    });
    
    // Обработка перемещения оборудования
    document.querySelectorAll('.move-equipment').forEach(button => {
        button.addEventListener('click', function() {
            equipmentIdToMove = this.getAttribute('data-id');
            const equipmentName = this.getAttribute('data-name');
            const currentClassroom = this.getAttribute('data-current-classroom');
            
            document.getElementById('moveEquipmentName').textContent = equipmentName;
            
            // Исключаем текущую аудиторию из списка
            const select = document.getElementById('to_classroom_id');
            Array.from(select.options).forEach(option => {
                if (option.value === currentClassroom) {
                    option.disabled = true;
                    option.textContent += ' (текущая)';
                }
            });
            
            const modal = new bootstrap.Modal(document.getElementById('moveModal'));
            modal.show();
        });
    });
    
    // Обработка формы перемещения
    document.getElementById('moveForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = {
            to_classroom_id: formData.get('to_classroom_id'),
            movement_reason: formData.get('movement_reason')
        };
        
        if (!equipmentIdToMove) return;
        
        fetch(`/equipment/move/${equipmentIdToMove}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                bootstrap.Modal.getInstance(document.getElementById('moveModal')).hide();
                location.reload();
            } else {
                alert('Ошибка: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при перемещении');
        });
    });
    
    // Сброс формы при закрытии модального окна перемещения
    document.getElementById('moveModal')?.addEventListener('hidden.bs.modal', function() {
        document.getElementById('moveForm').reset();
        equipmentIdToMove = null;
        const select = document.getElementById('to_classroom_id');
        Array.from(select.options).forEach(option => {
            option.disabled = false;
            if (option.textContent.includes('(текущая)')) {
                option.textContent = option.textContent.replace(' (текущая)', '');
            }
        });
    });
});