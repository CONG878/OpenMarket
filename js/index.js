document.addEventListener("DOMContentLoaded", () => {
    // 페이지 로드 시 로컬 스토리지에서 사용자 데이터를 가져옴
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Load header
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('header').outerHTML = data;

            // 로그인 정보가 있을 때 로그인을 마이페이지로 대체
            const userAction = document.querySelector('.user-action');
            if (userInfo && userInfo.token) {
                userAction.href = "myPage.html";
                userAction.innerHTML = '<img src="img/myPage.svg" alt="마이페이지">';
            }

            // 장바구니 링크 클릭 시 로그인 확인
            const cartLink = document.querySelector('.cart-link');
            cartLink.addEventListener('click', (e) => {
                if (!userInfo || !userInfo.token) {
                    e.preventDefault(); // 장바구니 페이지로 이동하지 않도록 함
                    showModal(); // 모달창 표시
                }
            });
        });

    // Load footer
    fetch('footer.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('footer').outerHTML = data;
        });

    // Load modal
    fetch('modal.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('.main-modal').outerHTML = data;
            document.querySelector('.main-modal').style.display = 'none';

            // 모달 닫기 버튼 이벤트
            document.querySelector('.modal-close').addEventListener('click', closeModal);
            document.getElementById('modal-no').addEventListener('click', closeModal);
            document.getElementById('modal-yes').addEventListener('click', () => {
                window.location.href = 'login.html'; // 로그인 페이지로 이동
            });
        });

    // Initial fetch for products
    fetchProducts();
});

function fetchProducts(page = 1) {
    fetch(`https://estapi.openmarket.weniv.co.kr/products/?page=${page}`, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const productList = document.querySelector('.product-list');
        productList.innerHTML = ''; // Clear existing products
        data.results.forEach(product => {
            const productItem = document.createElement('figure');
            productItem.classList.add('product-item');

            productItem.innerHTML = `
                <a href="details.html?id=${product.id}">
                    <img src="${product.image}" alt="${product.name}">
                    <figcaption>
                        <h4>${product.seller.store_name}</h4>
                        <h2>${product.name}</h2>
                        <p class="text-md"><span>${product.price.toLocaleString()}</span>원</p>
                    </figcaption>
                </a>
            `;

            productList.appendChild(productItem);
        });
        // Update pagination
        updatePagination(data.count, page);
    })
    .catch(error => console.error('Error fetching products:', error));
}

function updatePagination(totalCount, currentPage) {
    const itemsPerPage = 15;
    const pageCount = Math.floor((totalCount - 1) / itemsPerPage + 1);
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = '';

    for (let i = 1; i <= pageCount; i++) {
        const pageButton = document.createElement('button');
        pageButton.innerText = i;
        pageButton.classList.add('page-link');
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            fetchProducts(i);
        });
        pagination.appendChild(pageButton);
    }
}

// 모달창을 표시하는 함수
function showModal() {
    const modal = document.querySelector('.main-modal');
    modal.style.display = 'flex';
}

// 모달창을 닫는 함수
function closeModal() {
    const modal = document.querySelector('.main-modal');
    modal.style.display = 'none';
}