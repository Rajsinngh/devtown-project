import { Types } from 'mongoose';
import {
  pinImage,
  addComment,
  unpin,
  updateTags,
} from '../../../server/controllers/put';
import pins from '../../../server/models/pins'; // schema for pins
import savedTags from '../../../server/models/tags';
import {
  user, rawPinsStub, allPinsResponse,
} from '../stub';
import { genericRequest } from '../interfaces';
import { PopulatedPinType } from '../../../server/interfaces';

/* Mongoose mocks */
const setupMocks = (response: PopulatedPinType[] | unknown = rawPinsStub) => {
  pins.findById = jest.fn().mockImplementation(
    () => ({
      exec: jest.fn().mockResolvedValue(response),
    }),
  );
};

describe('Pinning an image', () => {
  let res;
  let mockedFindById;
  let mockedFindByIdAndUpdate;
  const req = {
    user,
    body: {
      name: 'tester-twitter',
      service: 'twitter',
      id: user._id,
    },
    params: { _id: '3' },
  };
  beforeEach(() => {
    res = { json: jest.fn(), end: jest.fn() };
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('will pin an image', async () => {
    const newSavedBy = [
      ...rawPinsStub[2].savedBy,
      { _id: req.body.id, displayName: req.body.name, service: req.body.service },
    ];

    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue({ ...rawPinsStub[2], savedBy: newSavedBy }),
        })),
      }),
    );
    mockedFindByIdAndUpdate = jest.mocked(pins.findByIdAndUpdate);
    setupMocks(rawPinsStub[2]);
    await pinImage(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('3');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledWith(
      '3',
      {
        $set:
                  {
                    savedBy: [
                      { _id: 'another test id', displayName: 'tester-another', service: 'other-service' },
                      Types.ObjectId(user._id),
                    ],
                  },
      },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({
      ...allPinsResponse[2],
      savedBy: newSavedBy.map(({ displayName, _id, service }) => (
        { name: displayName, userId: _id, service }
      )),
      hasSaved: true,
    });
    expect(res.end).toHaveBeenCalledTimes(0);
    mockedFindByIdAndUpdate.mockClear();
  });

  test('will end response if pin not found in db', async () => {
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue(null),
      }),
    );
    mockedFindById = jest.mocked(pins.findById);
    await pinImage(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('3');
    expect(pins.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
    mockedFindById.mockClear();
  });

  test('will end response if updatedpin not returned from db', async () => {
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(null),
        })),
      }),
    );
    mockedFindByIdAndUpdate = jest.mocked(pins.findByIdAndUpdate);
    setupMocks(rawPinsStub[2]);
    await pinImage(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('3');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
    mockedFindByIdAndUpdate.mockClear();
  });

  test('will not pin an image if user has already pinned', async () => {
    const newSavedBy = [...rawPinsStub[2].savedBy, { id: req.body.id, name: req.body.name }];
    setupMocks({ ...rawPinsStub[2], savedBy: newSavedBy });
    await pinImage(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('3');
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('will respond with error if PUT is rejected', async () => {
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockRejectedValue(new Error('Mocked rejection')),
      }),
    );
    await pinImage(req as genericRequest, res);
    expect(res.json).toHaveBeenCalledWith(Error('Mocked rejection'));
  });
});

describe('Unpinning an image', () => {
  let res;
  const req = {
    user,
    params: { _id: '1' },
  };
  beforeEach(() => {
    res = { json: jest.fn(), end: jest.fn() };
    process.env = {
      ...process.env,
      ADMIN_USER_ID: 'xxx',
    };
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('will unpin an image', async () => {
    const updatedReq = { ...req, params: { _id: '2' } };
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue({ ...rawPinsStub[1], savedBy: [] }),
        })),
      }),
    );
    const mockedFindByIdAndUpdate = jest.mocked(pins.findByIdAndUpdate);

    setupMocks({ ...rawPinsStub[1], savedBy: ['5cad310f7672ca00146485a8'] });
    await unpin(updatedReq as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('2');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledWith(
      '2',
      {
        $set:
                  {
                    savedBy: [],
                  },
      },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({ ...allPinsResponse[1], savedBy: [], hasSaved: false });
    mockedFindByIdAndUpdate.mockClear();
  });

  test('will end response if pin not found in db', async () => {
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue(null),
      }),
    );

    await unpin(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('1');
    expect(pins.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('will end response if updatedpin not returned from db', async () => {
    const updatedReq = { ...req, params: { _id: '2' } };
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(null),
        })),
      }),
    );

    setupMocks(rawPinsStub[1]);
    await unpin(updatedReq as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('2');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('will respond with error if PUT is rejected', async () => {
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockRejectedValue(new Error('Mocked rejection')),
      }),
    );
    await unpin(req as genericRequest, res);
    expect(res.json).toHaveBeenCalledWith(Error('Mocked rejection'));
  });
});

describe('Adding a comment', () => {
  let res;
  const req = {
    user,
    body: {
      comment: 'a new comment',
    },
    params: { _id: '3' },
  };
  beforeEach(() => {
    res = { json: jest.fn(), end: jest.fn() };
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('will add a comment to a pin', async () => {
    const newCommentResponseStub = {
      _id: 'comment-Id-2',
      user: {
        _id: 'mongo_twitter test id',
        displayName: 'tester-twitter',
      },
      createdAt: 'today',
      comment: 'a new comment',
    };

    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue({
            ...rawPinsStub[2],
            comments: [...rawPinsStub[2].comments, newCommentResponseStub],
          }),
        })),
      }),
    );

    setupMocks(rawPinsStub[2]);
    await addComment(req as genericRequest, res);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledWith(
      '3',
      {
        $push:
                  {
                    comments: {
                      user: Types.ObjectId('5cad310f7672ca00146485a8'),
                      comment: 'a new comment',
                    },
                  },
      },
      { new: true },
    );

    expect(res.json).toHaveBeenCalledWith({
      _id: '3',
      imgDescription: 'description-3',
      imgLink: 'https://stub-3',
      owner: { userId: 'another test id', name: 'tester-another', service: 'other-service' },
      savedBy: [{ userId: 'another test id', name: 'tester-another', service: 'other-service' }],
      owns: false,
      hasSaved: false,
      comments: [
        {
          _id: 'comment-Id-1',
          displayName: 'tester-google',
          comment: 'unit tests',
          createdAt: 'today',
          userId: 'google test id',
        },
        {
          _id: 'comment-Id-2',
          displayName: 'tester-twitter',
          comment: 'a new comment',
          createdAt: 'today',
          userId: 'mongo_twitter test id',
        },
      ],
      tags: [],
    });
    expect(res.end).toHaveBeenCalledTimes(0);
  });

  test('will end response if updatedpin not returned from db', async () => {
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(null),
        })),
      }),
    );

    setupMocks(rawPinsStub[2]);
    await addComment(req as genericRequest, res);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('will respond with error if PUT is rejected', async () => {
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockRejectedValue(new Error('Mocked rejection')),
        })),
      }),
    );
    await addComment(req as genericRequest, res);
    expect(res.json).toHaveBeenCalledWith(Error('Mocked rejection'));
  });
});

describe('Updating tags for a pin', () => {
  let res;
  beforeEach(() => {
    res = { json: jest.fn(), end: jest.fn() };
    process.env = {
      ...process.env,
      ADMIN_USER_ID: 'xxx',
    };
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('will add a tag to a pin', async () => {
    const req = {
      user,
      query: { pinID: '1', tag: 'a new tag' },
    };
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue({ owner: '5cad310f7672ca00146485a8' }),
      }),
    );
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue({ ...rawPinsStub[1] }),
        })),
      }),
    );
    savedTags.create = jest.fn().mockResolvedValue([]);
    await updateTags(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('1');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      {
        $push:
                  {
                    tags: { tag: 'a new tag' },
                  },
      },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({ ...allPinsResponse[1] });
  });

  test('will remove a tag from a pin', async () => {
    const req = {
      user,
      query: { pinID: '1', deleteId: '12345' },
    };
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue({
          owner: '5cad310f7672ca00146485a8',
          tags: [{ _id: 12345 }, { _id: 123456 }],
        }),
      }),
    );
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue({ ...rawPinsStub[1] }),
        })),
      }),
    );
    const mockedFindByIdAndUpdate = jest.mocked(pins.findByIdAndUpdate);
    await updateTags(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('1');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(pins.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      {
        $set:
                  {
                    tags: [{ _id: 123456 }],
                  },
      },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({ ...allPinsResponse[1] });
    mockedFindByIdAndUpdate.mockClear();
  });

  test('will end response if pin not found in db', async () => {
    const req = {
      user,
      query: { pinID: '1', tag: 'a new tag' },
    };
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue(null),
      }),
    );
    savedTags.create = jest.fn().mockResolvedValue([]);
    await updateTags(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('1');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(0);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('will end response if user is not owner of the pin', async () => {
    const req = {
      user,
      query: { pinID: '1', tag: 'a new tag' },
    };
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue({ owner: { id: 'another id' } }),
      }),
    );
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue({ ...rawPinsStub[1] }),
      }),
    );
    await updateTags(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('1');
    expect(pins.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });

  test('will end response if updatedpin not returned from db', async () => {
    const req = {
      user,
      query: { pinID: '1', tag: 'a new tag' },
    };
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockResolvedValue({ owner: '5cad310f7672ca00146485a8' }),
      }),
    );
    pins.findByIdAndUpdate = jest.fn().mockImplementation(
      () => ({
        populate: jest.fn().mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(null),
        })),
      }),
    );
    savedTags.create = jest.fn().mockResolvedValue([]);
    await updateTags(req as genericRequest, res);
    expect(pins.findById).toHaveBeenCalledTimes(1);
    expect(pins.findById).toHaveBeenCalledWith('1');
    expect(pins.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  test('will respond with error if PUT is rejected', async () => {
    const req = {
      user,
      query: { pinID: '1', tag: 'a new tag' },
    };
    pins.findById = jest.fn().mockImplementation(
      () => ({
        exec: jest.fn().mockRejectedValue(new Error('Mocked rejection')),
      }),
    );
    await updateTags(req as genericRequest, res);
    expect(res.json).toHaveBeenCalledWith(Error('Mocked rejection'));
  });
});