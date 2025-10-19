 document.addEventListener('DOMContentLoaded', function() {
        const filterForm = document.getElementById('filterForm');
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');

        // При отправке формы, просто переходим по этому же URL, но с новыми параметрами
        filterForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Предотвращаем обычную отправку формы
            const formData = new FormData(filterForm);
            const params = new URLSearchParams(formData);
            window.location.href = `/?${params.toString()}`; // Обновляем URL
        });

        // При нажатии на кнопку сброса фильтров, переходим на главную страницу без параметров
        resetFiltersBtn.addEventListener('click', function() {
            window.location.href = '/';
        });
    });