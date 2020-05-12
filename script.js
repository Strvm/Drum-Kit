//Audio handlers
const audioContext = new AudioContext();
const cache = {};
const masterVolume = document.querySelector(('.masterVolume'));
let masterVolumeValue = masterVolume.value;
const pitchController = document.querySelector('.pitch');
const volumeController = document.querySelector('.volume');

//Important elements
const sound = document.querySelector(".sound");
const menu = document.querySelector(".menu");
const presetMenu = document.querySelector('#presetMenu')
const soundContainer = document.querySelector('.soundContainer');
const controlPanel = document.querySelector('.controllers');
const soundBox = document.querySelector('.soundBox');
const soundName = document.querySelector('.soundName');
const navButtons = document.querySelector('.globalControllers')

//Status variables
let isPlaying = false;
let hoveredSound = null;
let inMenu = false;
let selectedSound = null;

//Beat presets
const rockOnePreset = {
    "closedhihat": [0, 2, 4, 6, 8, 10, 12, 14],
    "snare": [4, 12],
    "kick": [0, 6, 8],
    "bpm": [110]
};
const rockTwoPreset = {
    "closedhihat": [0, 2, 4, 6, 8, 10, 12, 14],
    "snare": [4, 12],
    "kick": [0, 3, 6, 9, 10],
    "bpm": [110]
};
const housePreset = {
    "closedhihat": [2, 6, 10, 14],
    "hightom": [4, 12],
    "lowtom": [3, 6],
    "kick": [0, 4, 8, 12],
    "bpm": [120]
};
const hipHopPreset = {
    "closedhihat": [0, 2, 4, 6, 8, 10, 12, 14],
    "snare": [4, 9, 12],
    "kick": [0, 10],
    "bpm": [100]
};

//Used for the main audio loop
const bpmController = document.querySelector('.bpm');
let bpmValue = bpmController.value;
const soundPlayer = document.querySelector('.linePlayer');
const crashList = document.querySelector('.crash'); //First sound box, used to help the line player placement.
let playIndex = 0;
let playInterval;
let playedSounds = [];


/*
    Main play loop:
    - Loops through all the selected sounds and plays them with the given BPM.
    - Plays each sound with their own specific characteristics (Volume, Pitch and Stereo).
    - Gives played sound an "glow" effect when they're played.
    - Makes sure it puts them back in their normal state when they stop playing.
    - Deals with the "Line Player" which gives a visual feedback of where the loop is.
 */
const play = (currentIndex) => {
    if (playIndex === crashList.children.length) playIndex = 0;
    soundPlayer.style.left = (crashList.children[playIndex].getBoundingClientRect().left - 160) + 'px';
    for (let child of soundContainer.children) {
        if (child.children[playIndex] !== undefined) {
            if (child.children[playIndex].className.includes('selected')) {
                const target = child.children[playIndex];
                playSound(target.getAttribute("data-src"), target.getAttribute("data-volume"), target.getAttribute("data-pitch"), target.getAttribute("data-stereo"))
                target.style.boxShadow = "0px 20px 20px 0px rgba(153, 148, 153, 1)";
                target.style.filter = "brightness(180%)";
                playedSounds.push(target);
            }
            if (playIndex !== 0) {
                if (child.children[playIndex - 1].className.includes("selected")) {
                    child.children[playIndex - 1].style.boxShadow = "none";
                    child.children[playIndex - 1].style.filter = null;
                    removeItemAll(playedSounds, child.children[child.children.length - 1]);
                }
            } else {
                if (child.children[child.children.length - 1].className.includes("selected")) { //For the last sound box.
                    child.children[child.children.length - 1].style.boxShadow = "none";
                    child.children[child.children.length - 1].style.filter = null;
                    removeItemAll(playedSounds, child.children[child.children.length - 1]);
                }

            }

        }

    }
    playIndex++;
    playInterval = window.setTimeout(play, 1000 / ((bpmValue / 60) * 4)); //Calculating BPM into milliseconds.
}

/*
    stop:
    - Stop the current playing loop.
*/
const stop = () => {
    clearInterval(playInterval)
    for (let playedSound of playedSounds) {
        playedSound.style.boxShadow = "none";
        playedSound.style.filter = null;
    }
    soundPlayer.style.left = '0px';
    playIndex = 0;
};


/*
    preloadSounds:
    - Uses the loadSound method to load all sounds in the cache when the website loads up.
    - All sound paths are define by elements containing the "mainSound" class, we then take the sound
    name and concatenate it to get the path.
*/
const preloadSounds = () => {
    for (let x of [...document.querySelectorAll('.mainSound')]) {
        const audio = new Audio();
        audio.src = `./sounds/${x.className.replace('mainSound ', '')}.mp3`;
        loadSound(audio.src);
    }
}


/*
    loadSound:
    - Check if a sound is already cached or not.
*/
function loadSound(src) {
    if (cache[src]) {
        // Already cached
        return Promise.resolve(cache[src]);
    }
    return new Promise(resolve => {
        const request = new XMLHttpRequest();
        request.open("GET", src, true);
        request.responseType = "arraybuffer";
        request.onload = function() {
            const audioData = request.response;
            audioContext.decodeAudioData(audioData, function(buffer) {
                cache[src] = buffer;
                resolve(buffer);
            });
        };
        request.send();
    });
}


/*
    playSound:
    - Used to play a given sound.
    - Takes in parameter (most of these parameters come from data attributes of a given element):
        - Path to the audio file.
        - Volume of the sound you want to play.
        - Pitch of the sound you want to play.
        - Stereo level (left or right) of the sound you want to play.
    - We then use the AudioContext API to play the sound with the given modifications.
*/
function playSound(src, volume, pitch, stereo) {
    loadSound(src).then(buffer => {
        const stereoControl = audioContext.createStereoPanner();
        const volumeControl = audioContext.createGain();
        volumeControl.gain.value = volume * masterVolumeValue;
        stereoControl.pan.value = stereo;
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;
        source
            .connect(volumeControl)
            .connect(stereoControl)
            .connect(audioContext.destination);
        source.start();
    });
}


/*
    menuListener:
    - Deals with buttons inside the sound editing Menu.
    - Updates the controllers (Volume/Pitch/Stereo) to match the current values of the selected sound.
    - Also give the user the ability to test the modifications applied to the sound inside the menu.
*/
const menuListener = (event) => {
    const target = event.target;
    if (target.className === 'saveButton' && inMenu) {
        inMenu = false;
        soundContainer.style.filter = 'none';
        menu.style.visibility = 'hidden';
    } else if (target.className === 'soundBox' || target.parentElement.className === 'soundBox') {
        updateControllers();
        playSound(selectedSound.getAttribute("data-src"), selectedSound.getAttribute("data-volume"), selectedSound.getAttribute("data-pitch"), selectedSound.getAttribute("data-stereo"))
    }
};


/*
    controllersListener:
    - Adds the "fill in" effect to input range elements.
 */
const controllersListener = (event) => {
    if (!inMenu) return;
    const target = event.target;
    const control = `data-${target.className.replace('controller ', '')}`;
    selectedSound.setAttribute(control, target.value);
    if (!target.className.includes('stereo')) {
        target.style.background = 'linear-gradient(to right, #8e44ad 0%, #8e44ad ' + target.value / (target.getAttribute('max') - target.getAttribute('min')) * 100 + '%, #fff ' + target.value + '%, white 100%)';
    }
};


/*
    masterVolumeChange:
    - Adds the "fill in" effect to input range master volume element.
 */
const masterVolumeChange = (event) => {
    masterVolumeValue = event.target.value;
    event.target.style.background = 'linear-gradient(to right, #8e44ad 0%, #8e44ad ' + event.target.value / (2 - 0) * 100 + '%, #fff ' + event.target.value + '%, white 100%)';
};


/*
    updateControllers:
    - Updates all inputs inside the sound menu editor to math the correct sound value.
 */
const updateControllers = () => {
    for (let child of controlPanel.children) {
        const target = child.children[0];
        if (target.tagName === 'INPUT') {
            if (!target.className.includes('stereo')) {
                target.style.background = 'linear-gradient(to right, #8e44ad 0%, #8e44ad ' + target.value / (target.getAttribute('max') - target.getAttribute('min')) * 100 + '%, #fff ' + target.value + '%, white 100%)';
            }
        }
    }
};


/*
    bpmChangeListener:
    - Listens to if the BPM input has been changed and assigns the new value.
*/
const bpmChangeListener = () => {
    bpmValue = bpmController.value;
};


/*
    clearKeys:
    - Un-selects all selected sounds.
    - Removes any remaining effects if the clear happened during the play loop.
*/
const clearKeys = () => {
    [...soundContainer.querySelectorAll('.selected')].forEach(function(item) {
        item.style.transition = "background-color 100ms linear"
        item.classList.remove('selected');
        item.style.boxShadow = 'none';
    });
    playedSounds = [];
};


/*
    setPreset:
    - Selects all sounds that are given in the preset that is selected.
    - Presets contains keys that are name after instruments used in the drum-kit.
    - Each given key contains values of each soundBox of their type that should be selected (0 - 15).
*/
const setPreset = (givenPreset) => {
    for (let presetsKey in givenPreset) {
        if (presetsKey === "bpm") {
            bpmValue = bpmController.value = givenPreset[presetsKey][0];
        } else {
            givenPreset[presetsKey].forEach(function(preset) {
                soundContainer.querySelector(`.${presetsKey}`).children[preset].classList.add('selected');
            });
        }
    }
}


/*
    presetClickerListener:
    - This is used to check which preset the user wants to use.
    - Checks what button was clicked and then passes it to the setPreset function.
*/
const presetClickerListener = (event) => {
    const target = event.target;
    clearKeys();
    switch (target.className) {
        case 'rockOnePreset':
            setPreset(rockOnePreset)
            break;
        case 'rockTwoPreset':
            setPreset(rockTwoPreset)
            break;
        case 'housePreset':
            setPreset(housePreset)
            break;
        case 'hipHopPreset':
            setPreset(hipHopPreset)
            break;
    }
}

/*
    navigationButtonsListener:
    - Listener that handles clicks in the navigation bar.
    - Currently handles these buttons:
        - play: Calls the play loop function.
        - stop: Stops the playInterval and removes effects to sounds that were being played.
        -clear: Calls the clear function.
*/
const navigationButtonsListener = (event) => {
    const target = event.target;
    const buttonName = target.className.replace('button ', '');
    switch (buttonName) {
        case 'play':
            if (!isPlaying){
                play();
                isPlaying = true;
            }
            break;
        case 'stop':
            if (isPlaying){
                stop();
                isPlaying = false;
            }
            break;
        case 'clear':
            clearKeys();
            break;
        default:
            break;
    }
}

/*
    keydownListener:
    - Used to detect if the user tries to start the loop by pressing the Space key.
*/
const keydownListener = (event) => {
    if (event.code === 'Space'){
     if (isPlaying){
        stop();
        isPlaying = false;
     }else {
         play();
         isPlaying = true;
     }
    }
}


/*
    removeItemAll:
    - Used to remove all the recurring values in an array.
    - Mainly used with the playedSounds array that stores all the sounds that were just played.
*/
const removeItemAll = (array, value) => {
    let temp = 0;
    while (temp < array.length) {
        if (array[temp] === value) {
            array.splice(temp, 1);
        } else {
            ++temp;
        }
    }
    return array;
}


//Used to access the edit menu of sounds.
[...document.querySelectorAll('.sound')].forEach(function(item) {
    item.addEventListener('click', function(event) {
        const target = event.target;
        if (inMenu) return;
        if (target.className === 'dots') {
            const sound = target.parentElement;
            selectedSound = sound;
            const name = sound.parentElement.className;
            volumeController.value = sound.getAttribute('data-stereo');
            volumeController.value = sound.getAttribute('data-volume');
            pitchController.value = sound.getAttribute('data-pitch');
            soundBox.style.backgroundColor = window.getComputedStyle(selectedSound, null).getPropertyValue("background-color");
            soundName.innerText = name.charAt(0).toUpperCase() + name.slice(1);
            menu.style.visibility = 'visible';
            soundContainer.style.filter = 'blur(5px) grayscale(50%)';
            updateControllers();
            inMenu = true;
            return;
        }
        if (target.classList.contains('selected')) {
            target.classList.remove('selected');
        } else {
            playSound(target.getAttribute("data-src"), target.getAttribute("data-volume"), target.getAttribute("data-pitch"), target.getAttribute("data-stereo"))
            target.classList.add('selected');
        }
    });
});


//Used to make the 3 dots disappear when hovering off a sound.
[...document.querySelectorAll('.sound')].forEach(function(item) {
    item.addEventListener('mouseover', function(event) {
        const target = event.target;
        if (inMenu || (hoveredSound != null && target === hoveredSound) || !target.className.includes('sound')) return;
        hoveredSound = target;
        const img = document.createElement("img");
        img.src = './images/threedots.png';
        img.className = 'dots';
        hoveredSound.appendChild(img);
    });
});


//Used to make the 3 dots appear when hovering a sound.
[...document.querySelectorAll('.sound')].forEach(function(item) {
    item.addEventListener('mouseleave', function(event) {
        if (hoveredSound == null) return
        item.removeChild(event.target.querySelector('.dots'));
        hoveredSound = null;
    });
});


//Event Listeners
navButtons.addEventListener('click', navigationButtonsListener);
presetMenu.addEventListener('click', presetClickerListener);
menu.addEventListener('click', menuListener);
controlPanel.addEventListener('input', controllersListener);
masterVolume.addEventListener('input', masterVolumeChange);
bpmController.addEventListener('input', bpmChangeListener);
document.addEventListener('keydown', keydownListener);

//Functions to call when website loads.
preloadSounds();