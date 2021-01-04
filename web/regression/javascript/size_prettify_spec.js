//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

define(['sources/size_prettify'], function (sizePrettify) {
  describe('sizePrettify', function () {
    describe('when size is 0', function () {
      it('returns 0 bytes', function () {
        expect(sizePrettify(0)).toEqual('0 bytes');
      });
    });

    describe('when size >= 10kB and size < 10 MB', function () {
      it('returns size in kB', function () {
        expect(sizePrettify(10240)).toEqual('10 kB');
      });

      it('returns size in kB', function () {
        expect(sizePrettify(99999)).toEqual('98 kB');
      });
    });


    describe('when size >= 10MB and size < 10 GB', function () {
      it('returns size in MB', function () {
        expect(sizePrettify(10485760)).toEqual('10 MB');
      });

      it('returns size in MB', function () {
        expect(sizePrettify(44040192)).toEqual('42 MB');
      });
    });


    describe('when size >= 10GB and size < 10 TB', function () {
      it('returns size in GB', function () {
        expect(sizePrettify(10737418240)).toEqual('10 GB');
      });

      it('returns size in GB', function () {
        expect(sizePrettify(10736344498176)).toEqual('9999 GB');
      });
    });

    describe('when size >= 10TB and size < 10 PB', function () {
      it('returns size in TB', function () {
        expect(sizePrettify(10995116277760)).toEqual('10 TB');
      });

      it('returns size in TB', function () {
        expect(sizePrettify(29995116277760)).toEqual('27 TB');
      });
    });

    describe('when size >= 10 PB', function () {
      it('returns size in PB', function () {
        expect(sizePrettify(11258999068426200)).toEqual('10 PB');
      });

    });

  });
});
