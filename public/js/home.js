document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // CARROSSEL DE RESTAURANTES (TOP 6)
    // ==========================================
    const carouselList = document.querySelector('.card-carousel');

    if (carouselList) {
        try {
            const response = await fetch('/api/public/restaurantes');
            if (!response.ok) throw new Error('Erro ao buscar restaurantes');

            const restaurantes = await response.json();

            // Filtrar apenas restaurantes (excluir mercado se necessário, mas o pedido diz "restaurantes")
            // Ordenar por avaliação (decrescente)
            // Pegar os top 6
            const topRestaurantes = restaurantes
                .filter(r => r.categoria !== 'mercado') // Opcional: garantir que não mostre mercados
                .sort((a, b) => (b.avaliacao_media || 0) - (a.avaliacao_media || 0))
                .slice(0, 6);

            // Limpar itens hardcoded
            carouselList.innerHTML = '';

            if (topRestaurantes.length === 0) {
                carouselList.innerHTML = '<li class="card"><span>Nenhum restaurante encontrado</span></li>';
            }

            // Adicionar restaurantes
            topRestaurantes.forEach((restaurante) => {
                const li = document.createElement('li');
                li.className = 'card';
                li.style.cursor = 'pointer';
                li.onclick = () => window.location.href = `cardapio.html?id=${restaurante.id}`;

                // Imagem padrão ou específica (se houver no futuro)
                const imgSrc = 'img/roy.jpg';

                li.innerHTML = `
                    <div class="img"><img src="${imgSrc}" alt="${restaurante.nome_publico}"></div>
                    <h2>${restaurante.nome_publico}</h2>
                    <span>${restaurante.avaliacao_media ? restaurante.avaliacao_media.toFixed(1) : 'Novo'} ★</span>
                `;
                carouselList.appendChild(li);
            });
        } catch (error) {
            console.error('Erro ao carregar restaurantes:', error);
            carouselList.innerHTML = '<li class="card"><span>Erro ao carregar</span></li>';
        }
    }

    // ==========================================
    // CARROSSEL DE IMAGENS (PRINCIPAL)
    // ==========================================
    const track = document.querySelector('.carousel-track');
    const slides = track ? Array.from(track.children) : [];
    const nextButton = document.querySelector('.carousel-next');
    const prevButton = document.querySelector('.carousel-prev');
    const indicators = document.querySelectorAll('.indicator');

    if (track && slides.length > 0) {
        let currentSlideIndex = 0;

        const updateSlide = (index) => {
            // Remove active class from all
            slides.forEach(slide => slide.classList.remove('active'));
            indicators.forEach(ind => ind.classList.remove('active'));

            // Add active class to current
            slides[index].classList.add('active');
            if (indicators[index]) indicators[index].classList.add('active');

            currentSlideIndex = index;
        };

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const nextIndex = (currentSlideIndex + 1) % slides.length;
                updateSlide(nextIndex);
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                const prevIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
                updateSlide(prevIndex);
            });
        }

        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                updateSlide(index);
            });
        });

        // Auto play (opcional, 5 segundos)
        setInterval(() => {
            const nextIndex = (currentSlideIndex + 1) % slides.length;
            updateSlide(nextIndex);
        }, 5000);
    }
});
