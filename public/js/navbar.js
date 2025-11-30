window.addEventListener("scroll", function () {
    const navbar = document.querySelector(".navbar");
    const navbarShort = document.querySelector(".navbarshort");

    if (window.scrollY > 20) {
        navbar.classList.add("scrolled");
    } else {
        navbar.classList.remove("scrolled");
    }

    if (navbarShort) {
        if (window.scrollY > 20) {
            navbarShort.classList.add("scrolled");
        } else {
            navbarShort.classList.remove("scrolled");
        }
    }
});

// Controle do menu mobile
document.addEventListener('DOMContentLoaded', function () {
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        navbarContainer.innerHTML = `
    <div class="navbarshort">
        <ul class="navbarshort-links">
            <li><img src="img/ivegan-logo.png" height="25" alt="Logo Ivegan"></li>
            <li>
                <button class="menu-toggle" aria-label="Abrir menu">☰</button>
            </li>
        </ul>
    </div>

    <div class="navbar">
        <ul class="nav-links">
            <li><img src="img/ivegan-logo.png" height="25" alt="Logo Ivegan"></li>
            <li><a href="index.html">Home</a></li>
            <li><a href="mercado.html">Mercado</a></li>
            <li><a href="restaurante.html">Restaurante</a></li>
            <li><a href="pedidos.html">Pedidos</a></li>
            <li><a href="sobre.html">Sobre</a></li>
        </ul>

        <!-- Login & Cart -->
        <div class="auth-buttons d-flex align-items-center">
            <ul class="nav-links d-flex align-items-center mb-0">
                <li><a href="carrinho.html" class="cart-link" aria-label="Carrinho">
                    <svg class="cart-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                    <span id="cart-count" class="cart-badge">0</span>
                </a></li>
                <li><a href="login.html" class="login">Login</a></li>
                <li><a href="cadastro.html" class="cadastro">Entrar</a></li>
                <li>
                    <button class="menu-toggle" aria-label="Fechar menu">✕</button>
                </li>
            </ul>
        </div>
    </div>
      `;
    }

    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        footerContainer.innerHTML = `
    <footer class="footer">
        <div class="footer-left">
            <img class="footer-left-img" src="img/ivegan-logo.png" height="80" alt="Logo Ivegan">
            <h5>O delivery 100% vegano</h5>
        </div>
        <div class="footer-right">
            <ul>
                <li>Ivegan</li>
                <li><a href="#">Privacidade</a></li>
                <li><a href="#">Sobre</a></li>
                <li><a href="#">Entregador</a></li>
            </ul>
            <ul>
                <li>Links Importantes</li>
                <li><a href="#">teste</a></li>
                <li><a href="#">teste</a></li>
                <li><a href="#">teste</a></li>
            </ul>
            <ul>
                <li>Social</li>
                <li>
                    <a href="#" aria-label="Facebook">
                        <svg width="48" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_17_24)">
                                <path
                                    d="M48 24C48 10.7453 37.2547 0 24 0C10.7453 0 0 10.7453 0 24C0 35.255 7.74912 44.6995 18.2026 47.2934V31.3344H13.2538V24H18.2026V20.8397C18.2026 12.671 21.8995 8.8848 29.9194 8.8848C31.44 8.8848 34.0637 9.18336 35.137 9.48096V16.129C34.5706 16.0694 33.5866 16.0397 32.3645 16.0397C28.4294 16.0397 26.9088 17.5306 26.9088 21.4061V24H34.7482L33.4013 31.3344H26.9088V47.8243C38.7926 46.3891 48.001 36.2707 48.001 24H48Z"
                                    fill="#0866FF" />
                                <path
                                    d="M33.4003 31.3344L34.7472 24H26.9078V21.4061C26.9078 17.5306 28.4285 16.0397 32.3635 16.0397C33.5856 16.0397 34.5696 16.0694 35.136 16.129V9.48096C34.0627 9.1824 31.439 8.8848 29.9184 8.8848C21.8986 8.8848 18.2016 12.671 18.2016 20.8397V24H13.2528V31.3344H18.2016V47.2934C20.0582 47.7542 22.0003 48 23.999 48C24.983 48 25.9536 47.9395 26.9069 47.8243V31.3344H33.3994H33.4003Z"
                                    fill="white" />
                            </g>
                        </svg>
                    </a>
                </li>
                <li>
                    <a href="#" aria-label="WhatsApp">
                        <svg width="48" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M0 48L3.374 35.674C1.292 32.066 0.198 27.976 0.2 23.782C0.206 10.67 10.876 0 23.986 0C30.348 0.002 36.32 2.48 40.812 6.976C45.302 11.472 47.774 17.448 47.772 23.804C47.766 36.918 37.096 47.588 23.986 47.588C20.006 47.586 16.084 46.588 12.61 44.692L0 48ZM13.194 40.386C16.546 42.376 19.746 43.568 23.978 43.57C34.874 43.57 43.75 34.702 43.756 23.8C43.76 12.876 34.926 4.02 23.994 4.016C13.09 4.016 4.22 12.884 4.216 23.784C4.214 28.234 5.518 31.566 7.708 35.052L5.71 42.348L13.194 40.386ZM35.968 29.458C35.82 29.21 35.424 29.062 34.828 28.764C34.234 28.466 31.312 27.028 30.766 26.83C30.222 26.632 29.826 26.532 29.428 27.128C29.032 27.722 27.892 29.062 27.546 29.458C27.2 29.854 26.852 29.904 26.258 29.606C25.664 29.308 23.748 28.682 21.478 26.656C19.712 25.08 18.518 23.134 18.172 22.538C17.826 21.944 18.136 21.622 18.432 21.326C18.7 21.06 19.026 20.632 19.324 20.284C19.626 19.94 19.724 19.692 19.924 19.294C20.122 18.898 20.024 18.55 19.874 18.252C19.724 17.956 18.536 15.03 18.042 13.84C17.558 12.682 17.068 12.838 16.704 12.82L15.564 12.8C15.168 12.8 14.524 12.948 13.98 13.544C13.436 14.14 11.9 15.576 11.9 18.502C11.9 21.428 14.03 24.254 14.326 24.65C14.624 25.046 18.516 31.05 24.478 33.624C25.896 34.236 27.004 34.602 27.866 34.876C29.29 35.328 30.586 35.264 31.61 35.112C32.752 34.942 35.126 33.674 35.622 32.286C36.118 30.896 36.118 29.706 35.968 29.458Z"
                                fill="#25D366" />
                        </svg>
                    </a>
                </li>
                <li>
                    <a href="#" aria-label="YouTube">
                        <svg width="48" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_17_47)">
                                <path
                                    d="M47.044 12.3709C46.7726 11.3497 46.2378 10.4178 45.493 9.66822C44.7483 8.91869 43.8197 8.37791 42.8003 8.1C39.0476 7.09091 24.0476 7.09091 24.0476 7.09091C24.0476 7.09091 9.04761 7.09091 5.29488 8.1C4.27547 8.37791 3.34693 8.91869 2.60218 9.66822C1.85744 10.4178 1.32262 11.3497 1.05124 12.3709C0.0476075 16.14 0.0476074 24 0.0476074 24C0.0476074 24 0.0476075 31.86 1.05124 35.6291C1.32262 36.6503 1.85744 37.5822 2.60218 38.3318C3.34693 39.0813 4.27547 39.6221 5.29488 39.9C9.04761 40.9091 24.0476 40.9091 24.0476 40.9091 39.0476 40.9091 42.8003 39.9C43.8197 39.6221 44.7483 39.0813 45.493 38.3318C46.2378 37.5822 46.7726 36.6503 47.044 35.6291C48.0476 31.86 48.0476 24 48.0476 24C48.0476 24 48.0476 16.14 47.044 12.3709Z"
                                    fill="#FF0302" />
                                <path d="M19.1385 31.1373V16.8628L31.684 24.0001L19.1385 31.1373Z" fill="#FEFEFE" />
                            </g>
                        </svg>
                    </a>
                </li>
            </ul>
        </div>
    </footer>
        `;
    }

    const menuToggles = document.querySelectorAll('.menu-toggle');
    const navbar = document.querySelector('.navbar');
    const navbarShort = document.querySelector('.navbarshort');

    if (menuToggles.length > 0 && navbar && navbarShort) {
        // Adiciona evento para todos os botões de menu (☰ e ✕)
        menuToggles.forEach(toggle => {
            toggle.addEventListener('click', function () {
                // Verifica qual navbar está visível
                const isNavbarVisible = window.getComputedStyle(navbar).display !== 'none';

                if (isNavbarVisible) {
                    // Fecha o menu - volta para navbar short
                    navbar.style.display = 'none';
                    navbarShort.style.display = 'flex';
                } else {
                    // Abre o menu - mostra navbar completa
                    navbar.style.display = 'flex';
                    navbarShort.style.display = 'none';
                }
            });
        });
    }

    // Fecha menu ao clicar em links (exceto no botão ✕)
    const navLinks = document.querySelectorAll('.navbar a:not(.menu-toggle)');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 890) {
                navbar.style.display = 'none';
                navbarShort.style.display = 'flex';
            }
        });
    });

    // Garante estado correto ao redimensionar
    window.addEventListener('resize', function () {
        if (window.innerWidth > 890) {
            navbar.style.display = 'flex';
            navbarShort.style.display = 'none';
        } else {
            // No mobile, garante que só a short esteja visível
            if (navbar.style.display !== 'none') {
                navbar.style.display = 'none';
                navbarShort.style.display = 'flex';
            }
        }
    });


    // Highlight active link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinksItems = document.querySelectorAll('.navbar .nav-links a');

    navLinksItems.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else if (linkPath !== '#' && !link.classList.contains('login') && !link.classList.contains('cadastro')) {
            // Remove active from other main links, but keep for auth buttons if they were somehow active (though usually they aren't)
            // Actually, just removing active is fine as long as we don't mess up buttons that shouldn't be active.
            link.classList.remove('active');
        }
    });

    // Cart Synchronization Logic
    function updateNavbarCartCount() {
        const cart = JSON.parse(localStorage.getItem('ivegan_cart')) || [];
        const count = cart.reduce((acc, item) => acc + item.quantidade, 0);
        const badges = document.querySelectorAll('#cart-count'); // Select all badges (desktop and potentially mobile if added)
        badges.forEach(badge => {
            badge.textContent = count;
            // Optional: Hide badge if count is 0
            // if (count === 0) {
            //     badge.style.display = 'none';
            // } else {
            //     badge.style.display = 'flex';
            // }
        });
    }

    // Initial check
    updateNavbarCartCount();

    // Listen for custom event 'cartUpdated'
    window.addEventListener('cartUpdated', updateNavbarCartCount);

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'ivegan_cart') {
            updateNavbarCartCount();
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const carousel = document.querySelector('.carousel-simple');
    if (!carousel) return;

    const track = carousel.querySelector('.carousel-track');
    const slides = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    const indicators = carousel.querySelectorAll('.indicator');

    let currentSlide = 0;
    const totalSlides = slides.length;

    // Função para mostrar slide
    function showSlide(index) {
        // Remove active de todos
        slides.forEach(slide => slide.classList.remove('active'));
        indicators.forEach(indicator => indicator.classList.remove('active'));

        // Adiciona active no atual
        slides[index].classList.add('active');
        indicators[index].classList.add('active');

        currentSlide = index;
    }

    // Próximo slide
    function nextSlide() {
        let next = currentSlide + 1;
        if (next >= totalSlides) next = 0;
        showSlide(next);
    }

    // Slide anterior
    function prevSlide() {
        let prev = currentSlide - 1;
        if (prev < 0) prev = totalSlides - 1;
        showSlide(prev);
    }

    // Event listeners
    prevBtn.addEventListener('click', prevSlide);
    nextBtn.addEventListener('click', nextSlide);

    // Indicadores
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            showSlide(index);
        });
    });

    // Auto-play (opcional)
    let autoPlay = setInterval(nextSlide, 5000);

    // Pausa auto-play quando mouse está em cima
    carousel.addEventListener('mouseenter', () => {
        clearInterval(autoPlay);
    });

    carousel.addEventListener('mouseleave', () => {
        autoPlay = setInterval(nextSlide, 5000);
    });
});