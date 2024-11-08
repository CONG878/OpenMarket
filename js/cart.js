document.addEventListener("DOMContentLoaded", () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // Load header
    fetch('header.html')
        .then(response => response.text())
        .then(data => {
            document.querySelector('header').outerHTML = data;

            const userAction = document.querySelector('.user-action');
            if (!userInfo || !userInfo.token) {
                window.location.href = 'login.html';
            }
            userAction.href = "myPage.html";
            userAction.innerHTML = '<img src="img/myPage.svg" alt="마이페이지">';

            const cartLink = document.querySelector('.cart-link');
            cartLink.innerHTML = '<img src="img/activated_cart.svg" alt="장바구니 활성화">';
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

            document.querySelector('.modal-close').addEventListener('click', closeModal);
            document.getElementById('modal-no').addEventListener('click', closeModal);
            document.getElementById('modal-yes').addEventListener('click', () => {
                //window.location.href = 'login.html'; // 로그인 페이지로 이동
            });
        });

    fetch('https://estapi.openmarket.weniv.co.kr/cart', {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `JWT ${userInfo.token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const products = document.querySelector('.products-in-cart');
            const productPromises = data.results.map(async product => {
                const response = await fetch(`https://estapi.openmarket.weniv.co.kr/products/${product.product_id}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const productDetails = await response.json();
                const productItem = document.createElement('article');
                productItem.classList.add('product-item');
                productItem.innerHTML = `
                        <input type="checkbox" id="product-${product.product_id}" name="select-product" class="select-product">
                        <label for="product-${product.product_id}"></label>
                        <figure>
                            <img src="${productDetails.image}" alt="${productDetails.product_name}">
                            <figcaption>
                                <p class="text-sm">${productDetails.store_name}</p>
                                <h2>${productDetails.product_name}</h2>
                                <span class="text-md">${productDetails.price.toLocaleString()}원</span>
                                <p class="shipping text-sm">
                                    <span id="method">${productDetails.shipping_method == 'PARCEL' ? '택배배송' : '직접배송'}</span> / 
                                    <span id="fee"> ${productDetails.shipping_fee > 0 ? '배송비 ' + productDetails.shipping_fee.toLocaleString() + '원' : '무료배송'}</span>
                                </p>
                            </figcaption>
                        </figure>
                        <div class="quantity-controls" id="controls-${product.product_id}">
                            <button type="button" class="adjust dec">-</button>
                            <input name="quantity" class="quantity" value="${product.quantity}" pattern="\\d*" data-stock="${productDetails.stock}" data-price="${productDetails.price}">
                            <button type="button" class="adjust inc">+</button>
                        </div>
                        <div class="amount">
                            <p class="text-lg">${(productDetails.price * product.quantity).toLocaleString()}원</p>
                            <button type="button" class="green small">주문하기</button>
                        </div>
                        <button type="button" class="close"><img src="img/close.svg" alt=""></button>
                        `;
                products.appendChild(productItem);

                const decButton = productItem.querySelector('.dec');
                const incButton = productItem.querySelector('.inc');
                const quantityInput = productItem.querySelector('.quantity');
                const amountDisplay = productItem.querySelector('.amount p');
                const maxStock = parseInt(quantityInput.dataset.stock, 10);

                // 초기 버튼 상태 설정
                updateButtonState(quantityInput, decButton, incButton);

                // 수량 감소 버튼 클릭
                decButton.addEventListener('click', () => {
                    let quantity = parseInt(quantityInput.value, 10);
                    quantity = Math.max(0, quantity - 1);
                    quantityInput.value = quantity;
                    updateButtonState(quantityInput, decButton, incButton);
                    updatePriceDisplay(amountDisplay, quantityInput, product.cart_item_id, product.product_id);
                });

                // 수량 증가 버튼 클릭
                incButton.addEventListener('click', () => {
                    let quantity = parseInt(quantityInput.value, 10);
                    quantity = Math.min(maxStock, quantity + 1);
                    quantityInput.value = quantity;
                    updateButtonState(quantityInput, decButton, incButton);
                    updatePriceDisplay(amountDisplay, quantityInput, product.cart_item_id, product.product_id);
                });

                // 수량 직접 입력
                quantityInput.addEventListener('change', () => {
                    let quantity = parseInt(quantityInput.value, 10) || 0;
                    quantity = Math.min(Math.max(0, quantity), maxStock);
                    quantityInput.value = quantity;
                    updateButtonState(quantityInput, decButton, incButton);
                    updatePriceDisplay(amountDisplay, quantityInput, product.cart_item_id, product.product_id);
                });
                
                // close 버튼 클릭 시 상품 삭제 이벤트 추가
                const closeButton = productItem.querySelector('.close');
                closeButton.addEventListener('click', () => {
                    removeProductFromCart(productItem, product.cart_item_id);
                });
            });

            Promise.all(productPromises).then(() => {
                console.log('All products have been loaded.');
            });
        });

    // 전체 선택 체크박스 기능
    document.getElementById('select-all').addEventListener('change', function () {
        const allProductCheckboxes = document.querySelectorAll('.select-product');
        allProductCheckboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    // 버튼 상태 업데이트 함수
    function updateButtonState(quantityInput, decButton, incButton) {
        const quantity = parseInt(quantityInput.value, 10) || 0;
        const maxStock = parseInt(quantityInput.dataset.stock, 10);

        decButton.disabled = quantity <= 0;
        incButton.disabled = quantity >= maxStock;
    }

    // 가격 표시 업데이트 및 수량 변경을 서버에 전송하는 함수
    function updatePriceDisplay(amountDisplay, quantityInput, cartItemId, productId) {
        const price = parseInt(quantityInput.dataset.price, 10);
        const quantity = parseInt(quantityInput.value, 10);
        amountDisplay.textContent = `${(price * quantity).toLocaleString()}원`;
        calculateTotalAmount();

        fetch(`https://estapi.openmarket.weniv.co.kr/cart/${cartItemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `JWT ${userInfo.token}`
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity,
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update cart item');
            }
            return response.json();
        })
        .then(data => {
            console.log('Cart item updated successfully:', data);
        })
        .catch(error => {
            console.error('Error updating cart item:', error);
        });
    }

    // 합산된 총 금액을 계산하고 표시하는 함수
    function calculateTotalAmount() {
        let totalProductAmount = 0;
        let totalShippingFee = 0;

        document.querySelectorAll('.product-item').forEach(productItem => {
            const checkbox = productItem.querySelector('.select-product');
            if (checkbox.checked) {
                // .amount 에서 가격을 추출하여 숫자로 변환
                const amountText = productItem.querySelector('.amount p').textContent;
                const productAmount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
                totalProductAmount += productAmount;

                // #fee에서 배송비 추출
                const feeText = productItem.querySelector('#fee').textContent;
                const shippingFee = feeText.includes('무료') ? 0 : parseInt(feeText.replace(/[^0-9]/g, ''), 10);
                totalShippingFee += shippingFee;
            }
        });

        const totalAmount = totalProductAmount + totalShippingFee;

        // 총 금액을 표시
        document.querySelector('.total-product-price').textContent = totalProductAmount.toLocaleString();
        document.querySelector('.total-shipping-fee').textContent = totalShippingFee.toLocaleString();
        document.querySelector('.final-price').textContent = totalAmount.toLocaleString();
    }

    // 이벤트 리스너 추가
    document.querySelectorAll('.select-product').forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotalAmount);
    });

    document.querySelectorAll('.quantity-controls .adjust').forEach(button => {
        button.addEventListener('click', calculateTotalAmount);
    });

    document.querySelectorAll('.quantity').forEach(input => {
        input.addEventListener('change', calculateTotalAmount);
    });

    // 페이지 로드 시 초기 합산 금액 계산
    calculateTotalAmount();

    // 상품 삭제 기능
    function removeProductFromCart(productItem, cartItemId) {
        // 서버에 DELETE 요청 보내기
        fetch(`https://estapi.openmarket.weniv.co.kr/cart/${cartItemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `JWT ${userInfo.token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete cart item');
            }
            return response.json();
        })
        .then(data => {
            console.log('Cart item deleted successfully:', data);
            // 상품 요소를 페이지에서 제거
            productItem.remove();
            // 합산 금액 다시 계산
            calculateTotalAmount();
        })
        .catch(error => {
            console.error('Error deleting cart item:', error);
        });
    }
});