let gh_promotion = (function(){
  
  let config = {};
  let config_compiled = {}
  let qualifying_products_container = document.getElementById('gh-promotion-qualifying-products');
  let free_products_container = document.getElementById('gh-promotion-free-products');
  let add_to_cart = document.getElementById('gh-promotion-add-to-cart');
  let class_name = 'gh-promotion-qualifying-products-input';
  let no_qualify_class = 'qualify-no';
  let loading_class = 'loading';
  let variant_select_attribute = 'data-selector-for'
  let variant_image_attribute = 'data-image-for'
  let variant_input_selector = 'data-input-for'
  let trigger_attribute = 'data-trigger-for'
  let added_products_container = document.getElementById('added-products');
  let added_products_text = document.getElementById('added-products-text');
  let setup = (data) => {
    setup = data;
    compileConfig()
    createQualifyingProducts();
    attachVariantEvents()
    setupInputs();
    setupTriggers();
    updateText()
    add_to_cart.addEventListener('click', addToCart);
  }
  let compileConfig = () =>
  {
    config_compiled.qualifies = false;
    config_compiled.total_qty = 0;
    config_compiled.total_price = 0;
    config_compiled.qualifying = {}
    config.qualifying_products.variants.forEach( variant => {
      if( !variant.variants ) {
        config_compiled.qualifying[variant.id] = variant;
        config_compiled.qualifying[variant.id].qty = 0;
        config_compiled.qualifying[variant.id].price = variant.price;
        return;
      }
      variant.variants.forEach( child => {
        config_compiled.qualifying[child.id] = child;
        config_compiled.qualifying[child.id].qty = 0;
        config_compiled.qualifying[child.id].name = variant.name + ' - ' + child.variant
      })
    })
    console.log(config_compiled);
  }
  let createQualifyingProducts = () => {
    config.qualifying_products.variants.forEach( v => {
      if( v.variants ){
        let options = '';
        v.variants.forEach( child => {
          options += `<option value="${child.id}" data-image="${child.image}?w=600">${child.variant}</option>`
        })
        qualifying_products_container.innerHTML +=
          `<li>
                            <img alt="" src="" data-image-for="${v.name}">
                            <h3 class="gh-promotion-product-title">${v.name}</h3>
                            <p class="fa-filson">${v.description}</p>
                            <div class="gh-promotion-group-button">
                                <select data-selector-for="${v.name}">${options}</select>
                                <button class="button btn-dark-green btn--full" data-trigger-type="plus" data-variant-for="${v.name}" data-trigger-for="">Add</button>
                            </div>
                        </li>`;
        return;
      }
      qualifying_products_container.innerHTML += (
        `<li>
                        <img alt="" src="${v.image}?w=600">
                        <h3 class="gh-promotion-product-title">${v.name}</h3>
                        <p class="fa-filson">${v.description}</p>
                        <button class="button button--full-width btn-dark-green" data-trigger-type="plus" data-trigger-for="${v.id}">Add to Bundle</button>
                    </li>`
      )
    })
  }
  let attachVariantEvents = () => {
    document.querySelectorAll(`[${variant_select_attribute}]`).forEach( select => {
      select.addEventListener('change', () => { handleVariantChange(select) })
      handleVariantChange(select);
    })
  }
  let handleVariantChange = select => {
    let _for = select.getAttribute(variant_select_attribute);
    let img = document.querySelector(`[${variant_image_attribute}="${_for}"]`);
    let trigger = document.querySelector(`[data-variant-for="${_for}"]`);
    let selected_option = select.querySelector('option:checked');
    trigger.setAttribute(trigger_attribute, select.value);
    img.setAttribute('src', selected_option.getAttribute('data-image'));
  }
  let setupTriggers = () =>
  {
    document.querySelectorAll(`[${trigger_attribute}]`).forEach( trigger => {
      trigger.addEventListener('click', evt => {
        let variant = trigger.getAttribute(trigger_attribute);
        switch( trigger.getAttribute('data-trigger-type') ){
          case 'plus':
            config_compiled.qualifying[variant].qty++;
            break;
          case 'minus':
            config_compiled.qualifying[variant].qty--;
            break;
        }
        goToSummaryIfMobile()
        validate()
      })
    })
  }
  let goToSummaryIfMobile = () =>
  {
    // if( screen.width > 980 ) return;
    // document.querySelector('.product-list li:last-child *:last-child').scrollIntoView(true);
  }
  let setupInputs = () => {
    document.querySelectorAll(`.${class_name}`).forEach( input => {
      input.addEventListener('input', validate)
    })
  }
  let validate = () => {
    config_compiled.total_qty = 0;
    config_compiled.total_price = 0;
    Object.keys(config_compiled.qualifying).forEach( key => {
      let q = config_compiled.qualifying[key].qty;
      config_compiled.total_qty += q;
      if( q > 0 ) config_compiled.total_price += ( config_compiled.qualifying[key].price * q );
    });
    config_compiled.qualifies =
      ( config_compiled.total_qty >= config.qualifying_products.minimum_count
        && config_compiled.total_price >= config.qualifying_products.minimum_price
      );
    console.log(config_compiled);
    updateText()
    setStatus( config_compiled.qualifies )
  }
  let setStatus = status => {
    if( status ) {
      add_to_cart.classList.remove(no_qualify_class)
      add_to_cart.disabled = false;
    }
    else{
      add_to_cart.classList.add(no_qualify_class)
      add_to_cart.disabled = true;
    }
  }
  let updateText = () =>
  {
    let text = '';
    Object.keys( config_compiled.qualifying ).forEach( key => {
      let product = config_compiled.qualifying[key];
      if( product.qty < 1 ) return;
      text += `<li>${product.qty} x ${product.name} ($${product.price})</li>`;
    })
    if( config_compiled.qualifies ) {
      config.free_products.variants.forEach( free => {
        text += `<li>${config.free_products.free_quantity} x FREE ${free.name}</li>`;
      })
    }
    added_products_container.innerHTML = text;
    let min = config.qualifying_products.minimum_count;
    let min_price = config.qualifying_products.minimum_price;
    let rounder = (num)=>{
      return Math.round((num + Number.EPSILON) * 100) / 100
    }
    if( !config_compiled.qualifies ){
      if( config_compiled.total_qty === 0 ){
        added_products_text.innerHTML = `<b>Buy over $100 worth of products for 5 FREE Oxy-Powder Travel Samples</b>`;
        return;
      }
      let left = min - config_compiled.total_qty;
      if( left > 0 )
        added_products_text.innerHTML = `<b>Add ${left} more product(s) to qualify for 5 Oxy-Powder Travel Samples for FREE!</b>`;
      else
        added_products_text.innerHTML = `<b>Add $${rounder(min_price - config_compiled.total_price)} more to qualify for 5 Oxy-Powder Travel Samples for FREE!</b>`;
    } else{
      added_products_text.innerHTML = `<b style="color: var(--colorBtnPrimaryDim);">You now qualify! Add your 5 FREE Oxy-Powder Travel Samples</b>`;
    }
  }
  let addToCart = () =>
  {
    let products = [];
    Object.keys( config_compiled.qualifying ).forEach( key => {
      let product = config_compiled.qualifying[key];
      if( product.qty < 1 ) return
      products.push({
        id: product.id,
        quantity: product.qty
      });
    });
    config.free_products.variants.forEach( v => {
      products.push({
        id: v.id,
        quantity: config.free_products.free_quantity
      })
    })
    sendRequest(products)
  }
  let sendRequest = products =>
  {
    add_to_cart.classList.add(loading_class);
    let config = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({'items': products})
    }
    fetch(window.Shopify.routes.root + 'cart/add.js', config)
      .then(response => response.json())
      .then(data => {
        add_to_cart.classList.remove(loading_class);
        add_to_cart.classList.add('done');
        add_to_cart.disabled = true;
        console.log(data);
        window.location.reload();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }
  return {
    setup: setup
  }
  
})();