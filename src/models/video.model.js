import mongoose, { Schema } from "mongoose";
import mongooseAggregationPaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudynary url
      required: true,
    },
    thumbnail: {
      type: String, // cloudynary url
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: String, // cloudynary url
      required: true,
    },
    veiws: {
      type: Number,
      defaut: 0,
    },
    isPublished: {
      type: Boolean,
      defaut: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// plugin
videoSchema.plugin(mongooseAggregationPaginate);

export const Video = mongoose.model("Video", videoSchema);
