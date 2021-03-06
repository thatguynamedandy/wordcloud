'use strict';

/**
 * Creates wordclouds
 * @class WordCloud
 */
class WordCloud {

  static get MAX_TEXT_SIZE() { return 10; }
  static get TOTAL_FONT_SIZES() { return 6 };
  static get CLOUD_ROTATION() { return 720 };
  static get MAX_COLLISIONS_PER_ITEM() { return 50 };
  static get MAX_TEXT_SIZE() { return 8 }; //vw
  static get MIN_TEXT_SIZE() { return 0.2 }; //vw
  static get SPIRAL_STEP_X() { return 1 }; //lower is more dense but less performant
  static get SPIRAL_STEP_Y() { return 1.2 }; //lower is more dense but less performant
  static get FONT_INCREMENT() {
    return ((WordCloud.MAX_TEXT_SIZE - WordCloud.MIN_TEXT_SIZE)
        / WordCloud.TOTAL_FONT_SIZES);
  };

  /**
   * @constructor
   * @param {Object} element: The element to put the cloud in
   * @param {Array} topics: Array of the topics
   */
  constructor(element, topics) {
    if(!topics instanceof Array) throw 'Please provide an array of topics';
    if(typeof element !== 'object') throw 'Please provide container element';

    this.totalCollisions = 0;
    this.container = document.createElementNS('http://www.w3.org/2000/svg','svg');
    this.container.setAttributeNS(null, 'width', '100%');
    this.container.setAttributeNS(null, 'height', '100%');
    this.container.addEventListener('click', this.selectTopic.bind(this));
    element.appendChild(this.container);

    this.topics = topics.sort((a,b) => b.volume - a.volume);

    if(this.topics.length) {
      const fontSizeRange = this.topics[0].volume -
          this.topics[this.topics.length - 1].volume;
      this.groupSize = Math.ceil(fontSizeRange / WordCloud.TOTAL_FONT_SIZES);
      this.topics.forEach(this.addTopic, this);
    }

    //gives us a top level idea of performance
    console.log('collisions:' + this.totalCollisions);
  }

  /**
   * Adds a topic to the word cloud
   * @method addTopic
   * @private
   * @param {Object} topicData: Data about the topic to add
   * @param {Number} count: Numerical index of topic in cloud
   */
  addTopic(topicData, count) {
    const fontGroup = Math.min(Math.ceil(topicData.volume / this.groupSize),
        WordCloud.TOTAL_FONT_SIZES);
    const fontSize = (WordCloud.MIN_TEXT_SIZE + (WordCloud.FONT_INCREMENT * fontGroup))
        .toFixed(2) + 'vw';
    const spiralAngle = (WordCloud.CLOUD_ROTATION / this.topics.length) * count;
    const position = WordCloud.createPosition(spiralAngle, count);

    const topic = new Topic({
      fontSize: fontSize,
      position: position
    }, topicData);

    this.container.appendChild(topic.text);

    var textItems = this.container.querySelectorAll('text');
    var collisions = 0;

    while(WordCloud.detectCollision(textItems, topic.text) &&
        collisions < WordCloud.MAX_COLLISIONS_PER_ITEM) {
      topic.setPosition(WordCloud.createPosition(spiralAngle, count++));
      collisions++;
    }

    if(collisions === WordCloud.MAX_COLLISIONS_PER_ITEM) { //recursion safeguard
      this.container.removeChild(topic.text);
      console.warn(topicData.label + ' could not be contained in the tag cloud');
    }
    this.totalCollisions += collisions;
  }

  /**
   * User selects a topic in the cloud
   * @method addTopic
   * @param {Event} evt: The delegated click event from the user
   */
  selectTopic(evt) {
    if(evt.target.tagName === 'text') {
      document.dispatchEvent(new CustomEvent(TOPIC_SELECT_EVENT, {
        'detail': this.topics.find((a) => a.id === evt.target.getAttribute('uid'))
      }));
    }
  }

  /**
   * Educated guess at a suitable position
   * @method createPosition
   * @static
   * @param {Number} angle: Current angle in spiral loop
   * @param {Number} count: Current index of item
   * @return {Object} The cooridinates to set
   */
  static createPosition(angle, count) {
    var x = 50;
    var y = 50;
    if(count > 0) {
      x += ((count * WordCloud.SPIRAL_STEP_X)) * Math.cos(angle);
      y += ((count * WordCloud.SPIRAL_STEP_Y)) * Math.sin(angle);
    }
    return {x: parseInt(x), y: parseInt(y)};
  }

  /**
   * Educated guess at a suitable position
   * @method detectCollision
   * @static
   * @param {DOMCollection} textItems: DOM items to test agains
   * @param {Object} candidate: Current candidate item
   * @param {Boolean} was there a collision
   */
  static detectCollision(textItems, candidate) {
    return Array.from(textItems).some(WordCloud.boundsConflict.bind(WordCloud,
        candidate));
  }

  /**
   * Determines wether two text items collide
   * @method boundsConflict
   * @static
   * @param {Object} textItemA: First item to compare
   * @param {Object} textItemB: Second item to compare
   */
  static boundsConflict(textItemA, textItemB) {
    const a = textItemA.getBoundingClientRect();
    const b = textItemB.getBoundingClientRect();
    return textItemB.getAttribute('uid') != textItemA.getAttribute('uid')
      && !(a.left > b.right ||
        a.right < b.left ||
        a.top > b.bottom ||
        a.bottom < b.top);
  }
}
