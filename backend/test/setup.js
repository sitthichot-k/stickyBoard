import mongoose from 'mongoose';

// Unit tests don't connect to a DB. Disable command buffering so any accidental
// model call rejects immediately (and is swallowed) instead of hanging.
mongoose.set('bufferCommands', false);
