/* global describe, it, before */

import chai from 'chai';
import * as inspectorjs from '../dist/inspectorjs-lib.js';

chai.expect();

const expect = chai.expect;

let tsDemux;

describe('Check we can create a MpegTS demuxer', () => {
    it('should have a method for creating MpegTS demuxer', () => {
        expect(inspectorjs.createMpegTSDemuxer).to.not.be.undefined;
    });

});

describe('Given an instance of MpegTS demuxer', () => {
  before(() => {
    tsDemux = inspectorjs.createMpegTSDemuxer();
  });
  describe('when I create it', () => {
    it('should be an object', () => {
      expect(tsDemux).to.be.an('object');
    });
    it('should respond to demux', () => {
      expect(tsDemux).to.respondTo('append');
    });
  });
});
