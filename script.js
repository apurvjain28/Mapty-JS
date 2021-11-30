'use strict';

/*
//////// Learnings


// Using Google maps on browser
1. navigator.geolocation.getCurrentPosition( positionGiven(posn), positionDenied() ) >> Two callback functions as argument
    >> Asks for location of user and decides what to do if posn given or denied
       
// Using leaflet API   
2. leaflet Library: 
    >> Metioning script in body: The position of <script></script> is important. The script mentioned below 
    has access to global variable of scripts mentioned above them

    >> copy code from leaflet and paste
    >> one can render our coordinates in above code using navigator.geolocation (used above)

3. Map marker:
    >> 'on' Lmethod used instead of normal addEventListner method
    >> properties of .bindPopup() >> reading L.popup() function from documentation

4. Rendering Workout Input FOrm:
    >> form eventhandler >> 'submit'
    >> formType (select) eventhandler >> 'change'
    >> make local function variable as global variable to be used in other functions
    >> use of 'closest' to access parent element
    >> .focus() >> to put typer on the input when page loads 

5. Refactoring of the architecture:
    >> Putting code in architecture

6. Creating New workout:
    >> Get data from form
    >> check if data is valid
    >> if workout running, create running object
    >> if workout running, create cycling object
    >> Add new object to workout array
    >> render workout on map as marker
    >> render workout on list
    >> hide form +clear input field
  >> CReating healper functions 

LOCAL STORAGE APIs

*/

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDiscription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDiscription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDiscription();
    // this.type = 'cycling';
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / this.duration / 60;
    return this.speed;
  }
}

// const run1 = new Running([28, 77], 30, 120, 150);
// const cycling1 = new Cycling([29, 77], 30, 120, 150);
// console.log(run1, cycling1);
////////////////////////////////////////////////////////

// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workout = [];
  constructor() {
    // get user's position
    this._getPosition();

    // get local storage
    this._getLocalStorage();

    // attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Error: Could not get location');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude},12.71z`);

    //console.log(this);
    const coords = [latitude, longitude];

    // div with id=map in HTML, thats where our map loads
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // cant use addeventlistener as it means clicking anywhere on map is not supported
    // #map from leaflet library, we can add eventlistener here
    this.#map.on('click', this._showForm.bind(this));

    this.#workout.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // clear input field
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    // closest selects parents
    inputElevation.closest('.form__row ').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row ').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    //   >> Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //   >> check if data is valid
    //   >> if workout running, create running object

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input valid positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //   >> if workout cycling, create cycling object

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input valid positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //   >> Add new object to workout array
    this.#workout.push(workout);
    console.log(workout);

    //   >> render workout on map as marker
    this._renderWorkoutMarker(workout);

    //   >> render workout on list
    this._renderWorkout(workout);

    //   >> hide form +clear input field
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }

  // L.popup() >> popup attached to marker
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id='${workout.id}'>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon"> ${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            } </span>
            <span class="workout__value"> ${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
    `;

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    const workout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workout));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workout = data;

    this.#workout.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // location is object in browser
  }
}

const app = new App();
