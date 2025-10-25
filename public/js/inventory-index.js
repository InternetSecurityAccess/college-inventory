// Функции для главной страницы инвентаризации
document.addEventListener('DOMContentLoaded', function() {
    let inventoryIdToDelete = null;
    
    // Обработка удаления инвентаризации
    document.querySelectorAll('.delete-inventory').forEach(button => {
        button.addEventListener('click', function() {
            inventoryIdToDelete = this.getAttribute('data-id');
            const inventoryName = this.getAttribute('data-name');
            document.getElementById('inventoryName').textContent = inventoryName;
            const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
            modal.show();
        });
    });
    
    // Подтверждение удаления
    document.getElementById('confirmDelete')?.addEventListener('click', function() {
        if (inventoryIdToDelete) {
            fetch(`/inventory/delete/${inventoryIdToDelete}`, {
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
});