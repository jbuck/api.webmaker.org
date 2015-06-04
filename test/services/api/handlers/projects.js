var configs = require('../../../fixtures/configs/project-handlers'),
  userFixtures = require('../../../fixtures/users'),
  sinon = require('sinon'),
  nock = require('nock'),
  Lab = require('lab'),
  lab = exports.lab = Lab.script(),
  experiment = lab.experiment,
  before = lab.before,
  after = lab.after,
  test = lab.test,
  expect = require('code').expect,
  server;

function mockErr() {
  var e = new Error('relation does not exist');
  e.name = 'error';
  e.severity = 'ERROR';
  e.code = '42P01';
  return e;
}

before(function(done) {
  require('../../../mocks/server')(function(obj) {
    server = obj;
    done();
  });
});

after(function(done) {
  server.stop(done);
});

experiment('Project Handlers', function() {
  experiment('pg plugin error handler', function() {
    test('Handles errors from postgre adapter', function(done) {
      var opts = configs.pgAdapter.fail;
      var stub = sinon.stub(server.plugins['webmaker-postgre-adapter'].pg, 'connect')
        .callsArgWith(1, mockErr());
      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });

    test('Handles error from pg when making a transaction', function(done) {
      var opts = configs.pgAdapter.postFail;
      var clientStub = {
        query: sinon.stub()
      };

      clientStub.query.onFirstCall()
        .callsArgWith(1, userFixtures.chris_testing);

      sinon.stub(server.plugins['webmaker-postgre-adapter'].pg, 'connect')
        .callsArgWith(1, null, clientStub, function() {})
        .onSecondCall()
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        server.plugins['webmaker-postgre-adapter'].pg.connect.restore();
        done();
      });
    });

    test('handles error if begin query fails', function(done) {
      var opts = configs.pgAdapter.postFail;
      var clientStub = {
        query: sinon.stub()
      };

      clientStub.query.onFirstCall()
        .callsArgWith(1, userFixtures.chris_testing)
        .onSecondCall()
        .callsArgWith(1, mockErr())
        .onThirdCall()
        .callsArgWith(1, null, {});

      sinon.stub(server.plugins['webmaker-postgre-adapter'].pg, 'connect')
        .callsArgWith(1, null, clientStub, function() {});

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        server.plugins['webmaker-postgre-adapter'].pg.connect.restore();
        done();
      });
    });

    test('handles error if executeTransaction query fails', function(done) {
      var opts = configs.pgAdapter.postFail;
      var clientStub = {
        query: sinon.stub()
      };

      clientStub.query
        .onFirstCall().callsArgWith(1, userFixtures.chris_testing)
        .onSecondCall().callsArgWith(1, null, {})
        .onThirdCall().callsArgWith(1, mockErr())
        .onCall(3).callsArgWith(1, null)
        .onCall(4).callsArgWith(1, null, {});

      sinon.stub(server.plugins['webmaker-postgre-adapter'].pg, 'connect')
        .callsArgWith(1, null, clientStub, function() {});

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        server.plugins['webmaker-postgre-adapter'].pg.connect.restore();
        done();
      });
    });

    test('handles error if commit query fails', function(done) {
      var opts = configs.pgAdapter.postFail;
      var clientStub = {
        query: sinon.stub()
      };

      clientStub.query
        .onFirstCall().callsArgWith(1, userFixtures.chris_testing)
        .onSecondCall().callsArgWith(1, null, {})
        .onThirdCall().callsArgWith(1, null, { rows: [{ id: '1' }] })
        .onCall(3).callsArgWith(1, null, {})
        .onCall(4).callsArgWith(1, mockErr())
        .onCall(5).callsArgWith(1, null, {});

      sinon.stub(server.plugins['webmaker-postgre-adapter'].pg, 'connect')
        .callsArgWith(1, null, clientStub, function() {});

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        server.plugins['webmaker-postgre-adapter'].pg.connect.restore();
        done();
      });
    });

    test('handles error if rollback query fails', function(done) {
      var opts = configs.pgAdapter.postFail;
      var clientStub = {
        query: sinon.stub()
      };

      clientStub.query.onFirstCall()
        .callsArgWith(1, userFixtures.chris_testing)
        .onSecondCall()
        .callsArgWith(1, null, {})
        .onThirdCall()
        .callsArgWith(1, null, {})
        .onCall(3)
        .callsArgWith(1, mockErr())
        .onCall(4)
        .callsArgWith(1, null, {});

      sinon.stub(server.plugins['webmaker-postgre-adapter'].pg, 'connect')
        .callsArgWith(1, null, clientStub, function() {});

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        server.plugins['webmaker-postgre-adapter'].pg.connect.restore();
        done();
      });
    });
  });

  experiment('prequisites errors', function() {
    test('getUser pg error', function(done) {
      var opts = configs.prerequisites.fail;
      var stub = sinon.stub(server.methods.users, 'find')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });

    test('getProject pg error', function(done) {
      var opts = configs.prerequisites.fail;
      var stub = sinon.stub(server.methods.projects, 'findOne')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('GET - Discover', function() {
    test('default', function(done) {
      var opts = configs.get.discover.success.default;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        done();
      });
    });

    test('can change count', function(done) {
      var opts = configs.get.discover.success.changeCount;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(3);
        done();
      });
    });

    test('can change page', function(done) {
      var opts = configs.get.discover.success.changePage;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(3);
        done();
      });
    });

    test('returns 0 results when page out of range', function(done) {
      var opts = configs.get.discover.success.returnsNoneWhenPageTooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(0);
        done();
      });
    });

    test('count can not be negative', function(done) {
      var opts = configs.get.discover.fail.query.count.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be greater than 100', function(done) {
      var opts = configs.get.discover.fail.query.count.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be non-numeric', function(done) {
      var opts = configs.get.discover.fail.query.count.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be negative', function(done) {
      var opts = configs.get.discover.fail.query.page.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be greater than 50', function(done) {
      var opts = configs.get.discover.fail.query.page.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be non-numeric', function(done) {
      var opts = configs.get.discover.fail.query.page.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.get.discover.fail.error;
      var stub = sinon.stub(server.methods.projects, 'findFeatured')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('GET - one project (by user_id & id)', function() {
    test('returns a project', function(done) {
      var opts = configs.get.one.success;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.project).to.exist();
        expect(resp.result.project.id).to.equal('1');
        expect(resp.result.project.author.id).to.equal('1');
        done();
      });
    });

    test('404 user not found', function(done) {
      var opts = configs.get.one.fail.params.user.notFound;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(404);
        expect(resp.result.error).to.equal('Not Found');
        expect(resp.result.message).to.equal('User not found');
        done();
      });
    });

    test('user param must be numeric', function(done) {
      var opts = configs.get.one.fail.params.user.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('404 project not found', function(done) {
      var opts = configs.get.one.fail.params.projects.notFound;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(404);
        expect(resp.result.error).to.equal('Not Found');
        expect(resp.result.message).to.equal('Project not found');
        done();
      });
    });

    test('project param must be numeric', function(done) {
      var opts = configs.get.one.fail.params.projects.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.get.one.fail.error;
      var stub = sinon.stub(server.methods.projects, 'findOne')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.be.a.string();
        stub.restore();
        done();
      });
    });
  });

  experiment('GET - All projects', function() {
    test('default', function(done) {
      var opts = configs.get.all.success.default;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        done();
      });
    });

    test('can change count', function(done) {
      var opts = configs.get.all.success.changeCount;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(3);
        done();
      });
    });

    test('can change page', function(done) {
      var opts = configs.get.all.success.changePage;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(3);
        done();
      });
    });

    test('returns 0 results when page out of range', function(done) {
      var opts = configs.get.all.success.returnsNoneWhenPageTooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(0);
        done();
      });
    });

    test('count can not be negative', function(done) {
      var opts = configs.get.all.fail.query.count.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be greater than 100', function(done) {
      var opts = configs.get.all.fail.query.count.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be non-numeric', function(done) {
      var opts = configs.get.all.fail.query.count.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be negative', function(done) {
      var opts = configs.get.all.fail.query.page.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be greater than 50', function(done) {
      var opts = configs.get.all.fail.query.page.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be non-numeric', function(done) {
      var opts = configs.get.all.fail.query.page.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.get.all.fail.error;
      var stub = sinon.stub(server.methods.projects, 'findAll')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('GET - All by user', function() {
    test('default', function(done) {
      var opts = configs.get.byUser.success.default;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        done();
      });
    });

    test('can change count', function(done) {
      var opts = configs.get.byUser.success.changeCount;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(3);
        done();
      });
    });

    test('can change page', function(done) {
      var opts = configs.get.byUser.success.changePage;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(1);
        done();
      });
    });

    test('returns 0 results when page out of range', function(done) {
      var opts = configs.get.byUser.success.returnsNoneWhenPageTooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(0);
        done();
      });
    });

    test('count can not be negative', function(done) {
      var opts = configs.get.byUser.fail.query.count.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be greater than 100', function(done) {
      var opts = configs.get.byUser.fail.query.count.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be non-numeric', function(done) {
      var opts = configs.get.byUser.fail.query.count.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be negative', function(done) {
      var opts = configs.get.byUser.fail.query.page.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be greater than 50', function(done) {
      var opts = configs.get.byUser.fail.query.page.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be non-numeric', function(done) {
      var opts = configs.get.byUser.fail.query.page.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.get.byUser.fail.error;
      var stub = sinon.stub(server.methods.projects, 'findUsersProjects')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('GET - remixes', function() {
    test('default', function(done) {
      var opts = configs.get.remixes.success.default;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        done();
      });
    });

    test('can change count', function(done) {
      var opts = configs.get.remixes.success.changeCount;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(3);
        done();
      });
    });

    test('can change page', function(done) {
      var opts = configs.get.remixes.success.changePage;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(2);
        done();
      });
    });

    test('returns 0 results when page out of range', function(done) {
      var opts = configs.get.remixes.success.returnsNoneWhenPageTooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('success');
        expect(resp.result.projects).to.exist();
        expect(resp.result.projects).to.be.an.array();
        expect(resp.result.projects.length).to.equal(0);
        done();
      });
    });

    test('count can not be negative', function(done) {
      var opts = configs.get.remixes.fail.query.count.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be greater than 100', function(done) {
      var opts = configs.get.remixes.fail.query.count.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('count can not be non-numeric', function(done) {
      var opts = configs.get.remixes.fail.query.count.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be negative', function(done) {
      var opts = configs.get.remixes.fail.query.page.negative;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be greater than 50', function(done) {
      var opts = configs.get.remixes.fail.query.page.tooHigh;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('page can not be non-numeric', function(done) {
      var opts = configs.get.remixes.fail.query.page.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.get.remixes.fail.error;
      var stub = sinon.stub(server.methods.projects, 'findRemixes')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('Create', function() {
    experiment('New', function() {
      test('success, no thumbnail', function(done) {
        var opts = configs.create.new.success.withoutThumbnail;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(200);
          expect(resp.result.status).to.equal('created');
          expect(resp.result.project.id).to.exist();
          expect(resp.result.project.title).to.equal('create_test');
          expect(resp.result.project.version).to.equal('test');
          expect(resp.result.project.remixed_from).to.be.null();
          expect(resp.result.project.featured).to.be.false();
          expect(resp.result.project.history).to.exist();
          expect(resp.result.project.history).to.include(['created_at', 'updated_at']);
          expect(resp.result.project.thumbnail).to.be.an.object();
          expect(resp.result.project.thumbnail).to.not.include(['400', '1024']);
          expect(resp.result.page.id).to.exist();
          expect(resp.result.page.project_id).to.equal(resp.result.project.id);
          expect(resp.result.page.x).to.equal(0);
          expect(resp.result.page.y).to.equal(0);
          done();
        });
      });

      test('success, with thumbnail', function(done) {
        var opts = configs.create.new.success.withThumbnail;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(200);
          expect(resp.result.status).to.equal('created');
          expect(resp.result.project.id).to.exist();
          done();
        });
      });

      test('Creates new user from token', function(done) {
        var opts = configs.create.new.success.userFromToken;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(200);
          expect(resp.result.status).to.equal('created');
          expect(resp.result.project.id).to.exist();
          done();
        });
      });

      test('invalid title type', function(done) {
        var opts = configs.create.new.fail.payload.title;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('invalid thumbnail type', function(done) {
        var opts = configs.create.new.fail.payload.thumb;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('invalid thumbnail key value', function(done) {
        var opts = configs.create.new.fail.payload.thumbValue;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('invalid thumbnail key name', function(done) {
        var opts = configs.create.new.fail.payload.thumbKey;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('404 user not found', function(done) {
        var opts = configs.create.new.fail.params.user.notFound;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(404);
          expect(resp.result.error).to.equal('Not Found');
          expect(resp.result.message).to.equal('User not found');
          done();
        });
      });

      test('invalid user type', function(done) {
        var opts = configs.create.new.fail.params.user.notNumber;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('cant create for different user', function(done) {
        var opts = configs.create.new.fail.auth.wrongUser;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(403);
          expect(resp.result.error).to.equal('Forbidden');
          expect(resp.result.message).to.equal('Insufficient permissions');
          done();
        });
      });

      test('new user from token - handles errors from postgre', function(done) {
        var opts = configs.create.new.fail.auth.userFromToken;
        var stub = sinon.stub(server.methods.users, 'create')
          .callsArgWith(1, mockErr());

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(500);
          expect(resp.result.error).to.equal('Internal Server Error');
          expect(resp.result.message).to.be.a.string();
          stub.restore();
          done();
        });
      });

      test('tokenUser not found', function(done) {
        var opts = configs.create.new.fail.auth.tokenUserError;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(404);
          expect(resp.result.error).to.equal('Not Found');
          expect(resp.result.message).to.equal('User not found');
          done();
        });
      });

      test('tokenUser Error - handles errors from postgre', function(done) {
        var opts = configs.create.new.fail.auth.tokenUserError;
        sinon.stub(server.methods.users, 'find')
          .onFirstCall()
          .callsArgWith(1, null, { rows: [{ id: 1 }] })
          .onSecondCall()
          .callsArgWith(1, mockErr());

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(500);
          expect(resp.result.error).to.equal('Internal Server Error');
          expect(resp.result.message).to.be.a.string();
          server.methods.users.find.restore();
          done();
        });
      });

      test('handles errors from postgre', function(done) {
        var opts = configs.create.new.fail.error;
        var stub = sinon.stub(server.methods.projects, 'create')
          .callsArgWith(1, mockErr());

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(500);
          expect(resp.result.error).to.equal('Internal Server Error');
          expect(resp.result.message).to.be.a.string();
          stub.restore();
          done();
        });
      });
    });

    experiment('Remix', function() {
      test('success', function(done) {
        var opts = configs.create.remix.success.remix;
        var checkOpts = configs.create.remix.success.checkRemix;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(200);
          expect(resp.result.status).to.equal('created');
          expect(resp.result.project.id).to.exist();
          expect(resp.result.page.id).to.exist();
          expect(resp.result.page.project_id).to.equal(resp.result.project.id);
          expect(resp.result.page.x).to.equal(0);
          expect(resp.result.page.y).to.equal(0);

          checkOpts.url = checkOpts.url.replace('$1', resp.result.project.id);
          server.inject(checkOpts, function(getResp) {
            expect(getResp.statusCode).to.equal(200);
            expect(getResp.result.status).to.equal('success');
            expect(getResp.result.project.id).to.equal(resp.result.project.id);
            expect(getResp.result.project.remixed_from).to.equal('2');
            done();
          });
        });
      });

      test('404 user not found', function(done) {
        var opts = configs.create.remix.fail.params.user.notFound;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(404);
          expect(resp.result.error).to.equal('Not Found');
          expect(resp.result.message).to.equal('User not found');
          done();
        });
      });

      test('invalid user type', function(done) {
        var opts = configs.create.remix.fail.params.user.notNumber;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('404 project not found', function(done) {
        var opts = configs.create.remix.fail.params.project.notFound;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(404);
          expect(resp.result.error).to.equal('Not Found');
          expect(resp.result.message).to.equal('Project not found');
          done();
        });
      });

      test('invalid project type', function(done) {
        var opts = configs.create.remix.fail.params.project.notNumber;

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(400);
          expect(resp.result.error).to.equal('Bad Request');
          expect(resp.result.message).to.be.a.string();
          done();
        });
      });

      test('handles errors from postgre', function(done) {
        var opts = configs.create.remix.fail.error;
        var stub = sinon.stub(server.methods.projects, 'create')
          .callsArgWith(1, mockErr());

        server.inject(opts, function(resp) {
          expect(resp.statusCode).to.equal(500);
          expect(resp.result.error).to.equal('Internal Server Error');
          expect(resp.result.message).to.equal('An internal server error occurred');
          stub.restore();
          done();
        });
      });
    });
  });

  experiment('Patch - Update', function() {
    test('update title succeeds', function(done) {
      var opts = configs.patch.update.success.title;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.title).to.equal('new');
        done();
      });
    });

    test('update thumbnail (400) succeeds', function(done) {
      var opts = configs.patch.update.success.thumb;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.thumbnail[400]).to.equal('new');
        expect(resp.result.project.thumbnail[1024]).to.equal('');
        done();
      });
    });

    test('update thumbnail (1024) succeeds', function(done) {
      var opts = configs.patch.update.success.thumb2;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.thumbnail[400]).to.equal('');
        expect(resp.result.project.thumbnail[1024]).to.equal('new');
        done();
      });
    });

    test('update thumbnail (clearing it) succeeds', function(done) {
      var opts = configs.patch.update.success.clearThumb;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.thumbnail).to.exist();
        expect(resp.result.project.thumbnail[400]).to.equal('');
        expect(resp.result.project.thumbnail[1024]).to.equal('');
        done();
      });
    });

    test('update all succeeds', function(done) {
      var opts = configs.patch.update.success.all;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.title).to.equal('new2');
        expect(resp.result.project.thumbnail[400]).to.equal('new2');
        done();
      });
    });

    test('invalid user param', function(done) {
      var opts = configs.patch.update.fail.param.user;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('invalid project param', function(done) {
      var opts = configs.patch.update.fail.param.project;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('invalid title type', function(done) {
      var opts = configs.patch.update.fail.payload.title;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('invalid thumbnail type', function(done) {
      var opts = configs.patch.update.fail.payload.thumb;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('invalid thumbnail value type', function(done) {
      var opts = configs.patch.update.fail.payload.thumbValue;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('invalid thumbnail key', function(done) {
      var opts = configs.patch.update.fail.payload.thumbKey;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('cant update another user\'s project', function(done) {
      var opts = configs.patch.update.fail.auth.wrongUser;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(403);
        expect(resp.result.error).to.equal('Forbidden');
        expect(resp.result.message).to.equal('Insufficient permissions');
        done();
      });
    });

    test('moderator cant update another user\'s project', function(done) {
      var opts = configs.patch.update.fail.auth.wrongUser;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(403);
        expect(resp.result.error).to.equal('Forbidden');
        expect(resp.result.message).to.equal('Insufficient permissions');
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.patch.update.fail.error;
      var stub = sinon.stub(server.methods.projects, 'update')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('Feature', function() {
    test('features a project', function(done) {
      var opts = configs.patch.feature.success.feature;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.id).to.equal('1');
        expect(resp.result.project.featured).to.be.true();
        done();
      });
    });

    test('unfeatures a featured a project', function(done) {
      var opts = configs.patch.feature.success.unfeature;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('updated');
        expect(resp.result.project.id).to.equal('2');
        expect(resp.result.project.featured).to.be.false();
        done();
      });
    });

    test('404 user not found', function(done) {
      var opts = configs.patch.feature.fail.params.user.notFound;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(404);
        expect(resp.result.error).to.equal('Not Found');
        expect(resp.result.message).to.equal('User not found');
        done();
      });
    });

    test('user can not be non-numeric', function(done) {
      var opts = configs.patch.feature.fail.params.user.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('404 project not found', function(done) {
      var opts = configs.patch.feature.fail.params.project.notFound;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(404);
        expect(resp.result.error).to.equal('Not Found');
        expect(resp.result.message).to.equal('Project not found');
        done();
      });
    });

    test('project can not be non-numeric', function(done) {
      var opts = configs.patch.feature.fail.params.project.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('must be moderator', function(done) {
      var opts = configs.patch.feature.fail.auth.notMod;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(403);
        expect(resp.result.error).to.equal('Forbidden');
        expect(resp.result.message).to.equal('Insufficient permissions');
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.patch.feature.fail.error;
      var stub = sinon.stub(server.methods.projects, 'feature')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('Delete', function() {
    test('success, owner', function(done) {
      var opts = configs.del.success.owner;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('deleted');
        done();
      });
    });

    test('success, moderator', function(done) {
      var opts = configs.del.success.moderator;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        expect(resp.result.status).to.equal('deleted');
        done();
      });
    });

    test('404 user not found', function(done) {
      var opts = configs.del.fail.params.user.notFound;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(404);
        expect(resp.result.error).to.equal('Not Found');
        expect(resp.result.message).to.equal('User not found');
        done();
      });
    });

    test('invalid user type', function(done) {
      var opts = configs.del.fail.params.user.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('404 project not found', function(done) {
      var opts = configs.del.fail.params.project.notFound;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(404);
        expect(resp.result.error).to.equal('Not Found');
        expect(resp.result.message).to.equal('Project not found');
        done();
      });
    });

    test('invalid project type', function(done) {
      var opts = configs.del.fail.params.project.notNumber;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(400);
        expect(resp.result.error).to.equal('Bad Request');
        expect(resp.result.message).to.be.a.string();
        done();
      });
    });

    test('cant delete for different user', function(done) {
      var opts = configs.del.fail.auth.notOwner;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(403);
        expect(resp.result.error).to.equal('Forbidden');
        expect(resp.result.message).to.equal('Insufficient permissions');
        done();
      });
    });

    test('Handles errors from postgre', function(done) {
      var opts = configs.del.fail.error;
      var stub = sinon.stub(server.methods.projects, 'remove')
        .callsArgWith(1, mockErr());

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(500);
        expect(resp.result.error).to.equal('Internal Server Error');
        expect(resp.result.message).to.equal('An internal server error occurred');
        stub.restore();
        done();
      });
    });
  });

  experiment('Options', function() {
    test('responds to options requests', function(done) {
      var opts = configs.options.success;

      server.inject(opts, function(resp) {
        expect(resp.statusCode).to.equal(200);
        done();
      });
    });
  });

  experiment('Update Thumbnail Tails', function() {
    var screenshotMock;
    var screenshotVal1 = 'https://example.com/screenshot1.png';
    var screenshotVal2 = 'https://example.com/screenshot2.png';

    before(function(done) {
      screenshotMock = nock('https://webmaker-screenshot.example.com')
        .post(
          '/desktop/small/webmaker-desktop/' +
          'aHR0cHM6Ly93ZWJtYWtlci1wYWdlLmV4YW1wbGUuY29tLz91c2VyPTEmcHJvamVjdD0xJnBhZ2U9Mw=='
        )
        .once()
        .reply(200, {
          screenshot: screenshotVal1
        })
        .post(
          '/desktop/small/webmaker-desktop/' +
          'aHR0cHM6Ly93ZWJtYWtlci1wYWdlLmV4YW1wbGUuY29tLz91c2VyPTEmcHJvamVjdD0xJnBhZ2U9Mw=='
        )
        .once()
        .reply(200, {
          screenshot: screenshotVal2
        });

      var addelem1 = configs.tail.before.first;
      var addelem2 = configs.tail.before.second;
      server.inject(addelem1, function(resp) {
        expect(resp.statusCode).to.equal(200);
        server.inject(addelem2, function(resp) {
          expect(resp.statusCode).to.equal(200);
          done();
        });
      });
    });

    after(function(done) {
      screenshotMock.done();
      done();
    });

    test('updating the lowest page id in a project triggers a screenshot update', function(done) {
      var update = configs.tail.success.update;
      var check = configs.tail.success.check;

      server.once('tail', function() {
        server.inject(check, function(resp) {
          expect(resp.statusCode).to.equal(200);
          expect(resp.result.project.thumbnail[400]).to.equal(screenshotVal1);
          done();
        });
      });

      server.inject(update, function(resp) {
        expect(resp.statusCode).to.equal(200);
      });
    });

    test('updating (not) the lowest page id in a project does not trigger a screenshot update', function(done) {
      var update = configs.tail.noUpdate.update;
      var check = configs.tail.noUpdate.check;

      server.once('tail', function() {
        server.inject(check, function(resp) {
          expect(resp.statusCode).to.equal(200);
          // should not be different from previous test
          expect(resp.result.project.thumbnail[400]).to.equal(screenshotVal1);
          done();
        });
      });

      server.inject(update, function(resp) {
        expect(resp.statusCode).to.equal(200);
      });
    });

    test('updating an element in the lowest page id in a project triggers a screenshot update', function(done) {
      var update = configs.tail.elementSuccess.update;
      var check = configs.tail.elementSuccess.check;

      server.once('tail', function() {
        server.inject(check, function(resp) {
          expect(resp.statusCode).to.equal(200);
          expect(resp.result.project.thumbnail[400]).to.equal(screenshotVal2);
          done();
        });
      });

      server.inject(update, function(resp) {
        expect(resp.statusCode).to.equal(200);
      });
    });

    test('updating an element that is (not) part of the lowest page id in a project ' +
      'does not trigger a screenshot update',
      function(done) {
        var update = configs.tail.elementNoUpdate.update;
        var check = configs.tail.elementNoUpdate.check;

        server.once('tail', function() {
          server.inject(check, function(resp) {
            expect(resp.statusCode).to.equal(200);
            // should not be different from previous test
            expect(resp.result.project.thumbnail[400]).to.equal(screenshotVal2);
            done();
          });
        });

        server.inject(update, function(resp) {
          expect(resp.statusCode).to.equal(200);
        });
      }
    );
  });
});
