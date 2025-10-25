// Функции для страницы типов оборудования
document.addEventListener('DOMContentLoaded', function() {
    let typeIdToDelete = null;
    
    // Добавление типа оборудования
    document.getElementById('addTypeForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = {
            name: formData.get('name')
        };
        
        fetch('/equipment-types/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                bootstrap.Modal.getInstance(document.getElementById('addTypeModal')).hide();
                location.reload();
            } else {
                alert('Ошибка: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при добавлении');
        });
    });
    
    // Обработка удаления типа
    document.querySelectorAll('.delete-type').forEach(button => {
        button.addEventListener('click', function() {
            typeIdToDelete = this.getAttribute('data-id');
            const typeName = this.getAttribute('data-name');
            document.getElementById('typeName').textContent = typeName;
            const modal = new bootstrap.Modal(document.getElementById('deleteTypeModal'));
            modal.show();
        });
    });
    
    // Подтверждение удаления типа
    document.getElementById('confirmTypeDelete')?.addEventListener('click', function() {
        if (typeIdToDelete) {
            fetch(`/equipment-types/delete/${typeIdToDelete}`, {
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
                    bootstrap.Modal.getInstance(document.getElementById('deleteTypeModal')).hide();
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Произошла ошибка при удалении');
            });
        }
    });
});