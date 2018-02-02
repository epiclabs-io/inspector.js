/* global describe, it, before */

import chai from 'chai';
import * as inspectorjs from '../lib/inspectorjs-lib.js';

chai.expect();

const expect = chai.expect;

let webmDemux;

describe('Check we can create a webM demuxer', () => {
    it('should have a method for creating webM demuxer', () => {
        expect(inspectorjs.createWebMDemuxer).to.not.be.undefined;
    });

});

describe('Given an instance of WebM demuxer', () => {
  before(() => {
    webmDemux = inspectorjs.createWebMDemuxer();
  });
  describe('when I create it', () => {
    it('should be an object', () => {
      expect(webmDemux).to.be.an('object');
    });
    it('should respond to demux', () => {
      expect(webmDemux).to.respondTo('append');
    });
  });
});
