/* global describe, it, before */

import chai from 'chai';
import * as inspectorjs from '../dist/inspectorjs-lib.js';

chai.expect();

const expect = chai.expect;

let mp4Demux;

describe('Check we can create a MP4 demuxer', () => {
    it('should have a method for creating MP4 demuxer', () => {
        expect(inspectorjs.createMp4Demuxer).to.not.be.undefined;
    });

});

describe('Given an instance of MP4 demuxer', () => {
  before(() => {
    mp4Demux = inspectorjs.createMp4Demuxer();
  });
  describe('when I create it', () => {
    it('should be an object', () => {
      expect(mp4Demux).to.be.an('object');
    });
    it('should respond to demux', () => {
      expect(mp4Demux).to.respondTo('demux');
    });
  });
});
