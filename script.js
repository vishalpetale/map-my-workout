'use strict';

// prettier-ignore

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; //km
    this.duration = duration; //min
  }

  _setDescription(){
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`

  }

  click(){
    this.clicks++;
  }

}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; //steps/min
    this.calcPace();
    this._setDescription();
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
    this._setDescription();
  }

  calcSpeed() {
    // km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////
// Application Architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form-input-type');
const inputDistance = document.querySelector('.form-input-distance');
const inputDuration = document.querySelector('.form-input-duration');
const inputCadence = document.querySelector('.form-input-cadence');
const inputElevation = document.querySelector('.form-input-elevation');

class App {
  // private field(property)
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // Get user's location
    this._getPosition();

    // Get localStorage
    this._getLocalStorage();

    // Event Handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    console.log(navigator.geolocation);

    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Failed to get your position.');
      }
    );
  }

  _loadMap(position) {
    console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(latitude, longitude);
    // console.log(
    //   `https://www.google.co.in/maps/@${latitude},${longitude},14z?hl=en&authuser=0`
    // );

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling events on click on map.
    this.#map.on('click', this._showForm.bind(this));

    // Set Workout markers from localStorage
    if (this.#workouts) {
      this.#workouts.forEach(workout => {
        this._renderWorkoutMarker(workout);
      });
    }
  }

  _showForm(mapE) {
    form.classList.remove('hidden');
    inputDistance.focus();
    this.#mapEvent = mapE;
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.classList.add('hidden');

    form.style.display = 'none';
    setTimeout(() => {
      form.style.display = 'grid';
    }, 300);
  }

  _toggleElevationField() {
    inputElevation.closest('.form-row').classList.toggle('form-row-hidden');
    inputCadence.closest('.form-row').classList.toggle('form-row-hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper function
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositives = (...inputs) => inputs.every(inp => inp > 0);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Get input data from user
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Validate inputs / check if date is valid

    // if workout is running , create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Validate input
      if (
        //   !Number.isFinite(distance) ||
        //   !Number.isFinite(duration) ||
        //   !Number.isFinite(cadence)

        // Not require since i set input type = number
        !allPositives(distance, duration, cadence)
      ) {
        return alert('Inputs must be positive numbers.');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout is cycling , create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // elevation can be negative but needs to be number
      if (!allPositives(distance, duration))
        return alert('Inputs must be positive numbers.');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add object in workouts array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render Workout on list
    this._renderWorkoutonList(workout);

    // Store workout in localStorage
    this._setLocalStorage();

    // Hide form + Clear The input fields
    this._hideForm();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 150,

          autoClose: false,
          closeOnClick: false,

          className: `${workout.type}-popup`,
        }).setContent(workout.description)
      )
      .openPopup();
  }

  _renderWorkoutonList(workout) {
    let html = `
      <li class="workout workout-${workout.type}" data-id=${workout.id}>
        <h2 class="workout-title">Running on April 14</h2>
        <div class="workout-details">
          <span class="workout-icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
          }</span>
          <span class="workout-value">${workout.distance}</span>
          <span class="workout-unit">km</span>
        </div>
        <div class="workout-details">
          <span class="workout-icon">⏱</span>
          <span class="workout-value">${workout.duration}</span>
          <span class="workout-unit">min</span>
        </div>
      `;

    if (workout.type === 'running') {
      html += `
      <div class="workout-details">
        <span class="workout-icon">⚡</span>
        <span class="workout-value">${workout.pace.toFixed(1)}</span>
        <span class="workout-unit">min/km</span>
      </div>
      <div class="workout-details">
        <span class="workout-icon">🦶🏼</span>
        <span class="workout-value">${workout.cadence}</span>
         <span class="workout-unit">spm</span>
      </div>
    </li>
    `;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout-details">
        <span class="workout-icon">⚡</span>
        <span class="workout-value">${workout.speed.toFixed(1)}</span>
        <span class="workout-unit">km/hr</span>
      </div>
      <div class="workout-details">
        <span class="workout-icon">⛰</span>
        <span class="workout-value">${workout.elevationGain}</span>
        <span class="workout-unit">m</span>
      </div>
    </li> 
    `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const currWorkout = e.target.closest('.workout');

    if (!currWorkout) return;

    const workout = this.#workouts.find(
      work => work.id === currWorkout.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // this.#map.flyTo(workout.coords);

    // Using Public interface
    // workout.click();
    // console.log(workout);
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._renderWorkoutonList(workout);
    });
  }

  // Public Method
  resetLocalStorage() {
    localStorage.removeItem('workouts');
  }
}

const app = new App();
console.log(app);
// app.resetLocalStorage();
