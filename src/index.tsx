import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Review = Record<{
    id: string;
    body: string;
    rating: number;
    websiteURL: string;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type ReviewPayload = Record<{
    body: string;
    rating: number;
    websiteURL: string;
}>

const reviewStorage = new StableBTreeMap<string, Review>(0, 44, 1024);

$query;
export function getReviews(): Result<Vec<Review>, string> {
    return Result.Ok(reviewStorage.values());
}

$query;
export function getReview(id: string): Result<Review, string> {
    return match(reviewStorage.get(id), {
        Some: (review) => Result.Ok<Review, string>(review),
        None: () => Result.Err<Review, string>(`a review with id=${id} not found`)
    });
}

$update;
export function addReview(payload: ReviewPayload): Result<Review, string> {
    // Payload Validation: Ensure that body, rating, and websiteURL are present in the payload.
    if (!payload.body || typeof payload.rating !== 'number' || !payload.websiteURL) {
        return Result.Err("Missing or invalid fields in the payload.");
    }

    // Create a new review record
    const review: Review = {
        id: uuidv4(),
        createdAt: ic.time(),
        updatedAt: Opt.None,
        body: payload.body, // Explicit Property Setting
        rating: payload.rating, // Explicit Property Setting
        websiteURL: payload.websiteURL, // Explicit Property Setting
    };

    try {
        reviewStorage.insert(review.id, review); // Error Handling: Handle any errors during insertion
    } catch (error) {
        return Result.Err(`Failed to create the review: ${error}`);
    }

    return Result.Ok<Review, string>(review);
}

$update;
export function updateReview(id: string, payload: ReviewPayload): Result<Review, string> {
    // Parameter Validation: Ensure that the id is a valid UUID
    if (!id) {
        return Result.Err<Review, string>(`Invalid UUID: ${id}`);
    }

    // Payload Validation: Ensure that body, rating, and websiteURL are present in the payload.
    if (!payload.body || typeof payload.rating !== 'number' || !payload.websiteURL) {
        return Result.Err("Missing or invalid fields in the payload.");
    }

    return match(reviewStorage.get(id), {
        Some: (review) => {
            
            const updatedReview: Review = {
                ...review,
                ...payload,
                updatedAt: Opt.Some(ic.time()),
            };

            try {
                reviewStorage.insert(updatedReview.id, updatedReview); // Error Handling: Handle any errors during insertion
            } catch (error) {
                return Result.Err<Review, string>(`Failed to update the review: ${error}`);
            }

            return Result.Ok<Review, string>(updatedReview);
        },
        None: () => Result.Err<Review, string>(`Couldn't update a review with id=${id}. Review not found`),
    });
}

// can't delete review due to credibility

// a workaround to make uuid package work with Azle
globalThis.crypto = {
     // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};
