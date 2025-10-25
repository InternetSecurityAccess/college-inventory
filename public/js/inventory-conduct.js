// Функции для страницы проведения инвентаризации
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('inventoryForm');
    const quantityInputs = document.querySelectorAll('.quantity-input');
    const noteInputs = document.querySelectorAll('.note-input');
    
    // Функция обновления статуса строки
    function updateRowStatus(input) {
        const itemId = input.getAttribute('data-item-id');
        const expected = parseInt(input.getAttribute('data-expected'));
        const actual = parseInt(input.value) || 0;
        const row = document.querySelector(`.inventory-item[data-id="${itemId}"]`);
        const statusBadge = row.querySelector('.status-badge');
        
        let status, badgeClass, text;
        
        if (actual === 0) {
            status = 'missing';
            badgeClass = 'bg-danger';
            text = 'Отсутствует';
        } else if (actual === expected) {
            status = 'match';
            badgeClass = 'bg-success';
            text = 'OK';
        } else if (actual < expected) {
            status = 'deficit';
            badgeClass = 'bg-warning';
            text = `Недостача: ${expected - actual}`;
        } else {
            status = 'surplus';
            badgeClass = 'bg-info';
            text = `Излишек: ${actual - expected}`;
        }
        
        statusBadge.className = `status-badge badge ${badgeClass}`;
        statusBadge.textContent = text;
    }
    
    // Функция обновления статистики
    function updateStatistics() {
        let matched = 0, deficit = 0, surplus = 0;
        
        quantityInputs.forEach(input => {
            const expected = parseInt(input.getAttribute('data-expected'));
            const actual = parseInt(input.value) || 0;
            
            if (actual === expected && actual > 0) {
                matched++;
            } else if (actual < expected && actual > 0) {
                deficit++;
            } else if (actual > expected) {
                surplus++;
            }
        });
        
        document.getElementById('matchedItems').textContent = matched;
        document.getElementById('deficitItems').textContent = deficit;
        document.getElementById('surplusItems').textContent = surplus;
    }
    
    // Обработчики событий для основного оборудования
    quantityInputs.forEach(input => {
        input.addEventListener('input', function() {
            updateRowStatus(this);
            updateStatistics();
        });
        
        // Инициализация статуса при загрузке
        updateRowStatus(input);
    });
    
    noteInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Можно добавить дополнительную логику при необходимости
        });
    });
    
    // Сохранение черновика
    document.getElementById('saveDraft')?.addEventListener('click', function() {
        saveResults(false);
    });
    
    // Отправка формы (завершение инвентаризации)
    form?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveResults(true);
    });
    
    // Функция сохранения результатов
    function saveResults(isFinal) {
        const results = {};
        const inventoryId = document.querySelector('form')?.getAttribute('data-inventory-id') || 
                           window.inventoryId; // Можно передать через data-атрибут
        
        quantityInputs.forEach(input => {
            const itemId = input.getAttribute('data-item-id');
            const noteInput = document.querySelector(`.note-input[data-item-id="${itemId}"]`);
            
            results[itemId] = {
                expected: parseInt(input.getAttribute('data-expected')),
                actual: parseInt(input.value) || 0,
                note: noteInput ? noteInput.value : ''
            };
        });
        
        fetch(`/inventory/conduct/${inventoryId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                results,
                isFinal: isFinal 
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    alert(data.message);
                }
            } else {
                alert('Ошибка: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при сохранении');
        });
    }

    // Обработка добавления дополнительного оборудования
    document.getElementById('addItemForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const submitButton = document.getElementById('submitAddItem');
        const originalText = submitButton.innerHTML;
        const inventoryId = document.querySelector('form')?.getAttribute('data-inventory-id') || 
                           window.inventoryId;
        
        // Блокируем кнопку на время отправки
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Добавление...';
        
        const formData = new FormData(this);
        const data = {
            name: formData.get('name'),
            type_name: formData.get('type_name'),
            quantity: formData.get('quantity'),
            note: formData.get('note')
        };
        
        fetch(`/inventory/${inventoryId}/add-item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка сети');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Закрываем модальное окно
                bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
                
                // Добавляем новую строку в таблицу
                addAdditionalItemToTable(data.item);
                
                // Очищаем форму
                document.getElementById('addItemForm').reset();
                
            } else {
                alert('Ошибка: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при добавлении оборудования. Проверьте подключение к интернету.');
        })
        .finally(() => {
            // Восстанавливаем кнопку
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        });
    });

    // Функция для добавления элемента в таблицу
    function addAdditionalItemToTable(item) {
        const newRow = `
            <tr id="additionalItem-${item.id}">
                <td><strong>${item.name}</strong></td>
                <td>
                    <span class="badge bg-secondary">${item.type_name}</span>
                </td>
                <td>
                    <span class="badge bg-primary">${item.quantity} шт.</span>
                </td>
                <td>${item.note || '—'}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm remove-additional-item" 
                            data-id="${item.id}"
                            title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;

        const container = document.getElementById('additionalEquipmentContainer');
        const tableBody = document.getElementById('additionalItemsTable');
        const noItemsMessage = document.getElementById('noAdditionalItems');

        if (tableBody) {
            // Таблица уже существует, просто добавляем строку
            tableBody.insertAdjacentHTML('beforeend', newRow);
        } else {
            // Таблицы нет - создаем всю структуру
            const newTableHTML = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Тип</th>
                                <th>Количество</th>
                                <th>Примечание</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="additionalItemsTable">
                            ${newRow}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Удаляем сообщение "нет оборудования" и вставляем таблицу
            if (noItemsMessage) {
                noItemsMessage.remove();
            }
            container.innerHTML = newTableHTML;
        }

        // Добавляем обработчик для новой кнопки удаления
        document.querySelector(`#additionalItem-${item.id} .remove-additional-item`).addEventListener('click', removeAdditionalItem);
    }

    // Функция удаления дополнительного оборудования
    function removeAdditionalItem() {
        const itemId = this.getAttribute('data-id');
        const inventoryId = document.querySelector('form')?.getAttribute('data-inventory-id') || 
                           window.inventoryId;
        
        if (!confirm('Удалить это оборудование из инвентаризации?')) {
            return;
        }
        
        fetch(`/inventory/${inventoryId}/remove-item/${itemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const row = document.getElementById(`additionalItem-${itemId}`);
                if (row) {
                    row.remove();
                    
                    // Проверяем, остались ли еще элементы
                    const tableBody = document.getElementById('additionalItemsTable');
                    if (tableBody && tableBody.children.length === 0) {
                        // Если элементов нет, показываем сообщение
                        const container = document.getElementById('additionalEquipmentContainer');
                        container.innerHTML = '<p class="text-muted mb-0" id="noAdditionalItems">Дополнительное оборудование не добавлено</p>';
                    }
                }
            } else {
                alert('Ошибка: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при удалении');
        });
    }

    // Добавляем обработчики для существующих кнопок удаления
    document.querySelectorAll('.remove-additional-item').forEach(button => {
        button.addEventListener('click', removeAdditionalItem);
    });
    
    // Инициализация статистики
    updateStatistics();
});