    document.addEventListener('DOMContentLoaded', function() {
        // Функция для реализации поиска в select
        function setupSearchableSelect(searchInputId, selectElementId) {
            const searchInput = document.getElementById(searchInputId);
            const selectElement = document.getElementById(selectElementId);
            const options = Array.from(selectElement.children); // Получаем все <option>

            searchInput.addEventListener('input', function() {
                const searchTerm = searchInput.value.toLowerCase();

                // Проходимся по всем опциям и показываем/скрываем их
                options.forEach(option => {
                    const optionText = option.text.toLowerCase();
                    if (optionText.includes(searchTerm)) {
                        option.style.display = ''; // Показать опцию
                    } else {
                        option.style.display = 'none'; // Скрыть опцию
                    }
                });
            });
        }

        // Применяем к местоположениям
        setupSearchableSelect('locationSearch', 'location_id');
        // Применяем к видам предметов
        setupSearchableSelect('itemTypeSearch', 'item_type_id');
    });