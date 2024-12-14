document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const apiURL = `https://estapi.openmarket.weniv.co.kr/products/${productId}`;
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

    // Fetch product details
    fetch(apiURL, {
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            const img = document.querySelector('#product-img');
            img.src = `${data.image}`;
            const product = document.querySelector('.product-info');
            product.innerHTML = `
                <h3>${data.seller.store_name}</h3>
                <h1>${data.name}</h1>
                <p class="text-lg"><span class="amount-value">${data.price.toLocaleString()}</span>원</p>
                <p class="text-md">
                    <span id="method">택배배송</span> / 
                    <span id="fee">무료배송</span>
                </p>
            `;

            // 배송 방법 설정
            const methodElement = document.getElementById('method');
            if (data.shipping_method === "DELIVERY") {
                methodElement.innerText = "직접배송";
            }

            // 배송비 설정
            const feeElement = document.getElementById('fee');
            if (data.shipping_fee !== 0) {
                feeElement.innerText = `배송비 ${data.shipping_fee.toLocaleString()}원`;
            }

            const quantityInput = document.getElementById('quantity');
            const totalQuantity = document.querySelector('.quantity-value');
            const totalPrice = document.querySelector('.total-amount .amount-value');
            const decreaseButton = document.getElementById('dec');
            const increaseButton = document.getElementById('inc');
            let quantity = parseInt(quantityInput.value) || 0;

            function updateButtons() {
                decreaseButton.disabled = quantity <= 0;
                increaseButton.disabled = quantity >= data.stock;
            }

            function updatePrice() {
                totalQuantity.innerText = quantity;
                totalPrice.innerText = (data.price * quantity).toLocaleString();
            }

            quantityInput.addEventListener('change', () => {
                quantity = Math.min(Math.max(0, quantity), data.stock);
                updateButtons();
                updatePrice();
            });

            decreaseButton.addEventListener('click', () => {
                quantityInput.value = --quantity;
                updateButtons();
                updatePrice();
            });

            increaseButton.addEventListener('click', () => {
                quantityInput.value = ++quantity;
                updateButtons();
                updatePrice();
            });

            updateButtons();
            updatePrice();

            document.querySelector('.addToCart').addEventListener('click', () => {
                if (!userInfo || !userInfo.token) {
                    showModal(); // 유저 정보가 없는 경우 모달을 표시
                } else {
                    // 유저 정보가 있는 경우 상품을 장바구니에 추가하고 cart.html로 이동
                    fetch('https://estapi.openmarket.weniv.co.kr/cart', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `JWT ${userInfo.token}`
                        },
                        body: JSON.stringify({
                            "id": data.id,
                            "quantity": quantity
                        })
                    })/*
                    .then(response => {
                        console.log(response);
                        if (response.ok) {
                            alert("장바구니에 상품이 추가되었습니다.");
                            window.location.href = 'cart.html'; // cart.html로 이동
                        } else {
                            return response.json().then(errorData => {
                                throw new Error(errorData.message || "장바구니 추가에 실패했습니다.");
                            });
                        }
                    })*/
                    .then(async response => {
                        if (response.ok) window.location.href = 'cart.html';
                        
                        const errorData = await response.json();
                        throw new Error(errorData.message || "장바구니 추가에 실패했습니다.");
                    })
                    .catch(error => {
                        alert(`에러: ${error.message}`);
                    });
                }
            });            
        });
});

// 모달창을 표시하는 함수
function showModal() {
    const modal = document.querySelector('.main-modal');
    modal.style.display = 'block';
}

// 모달창을 닫는 함수
function closeModal() {
    const modal = document.querySelector('.main-modal');
    modal.style.display = 'none';
}