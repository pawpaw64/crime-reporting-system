// image slider
let items = document.querySelectorAll('.slider .list .item');
let thumbnails = document.querySelectorAll('.thumbnail .item');
let next = document.querySelector('#next');
let previous = document.querySelector('#previous');


let countItem = items.length;
let itemActive = 0;

let intervalRefreshing = setInterval(() => {
    next.click();
}, 3000);

next.onclick = function(){
    itemActive = itemActive + 1;
    if(itemActive >= countItem){
        itemActive = 0
    }
    sliderTurnedOn();
};
previous.onclick = function(){
    itemActive = itemActive - 1;
    if(itemActive < 0){
        itemActive = countItem - 1;
    }
    sliderTurnedOn();
};

function sliderTurnedOn(){
    let removeActiveSlider = document.querySelector('.slider .list .item.active');
    let removeActiveThumbnail = document.querySelector('.thumbnail .item.active');

    removeActiveSlider.classList.remove('active');
    removeActiveThumbnail.classList.remove('active');

    items[itemActive].classList.add('active');
    thumbnails[itemActive].classList.add('active');

    clearInterval(intervalRefreshing);
    intervalRefreshing = setInterval(() => {
        next.click();
    }, 3000);
}
thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
        itemActive = index;
        sliderTurnedOn();
    });
});