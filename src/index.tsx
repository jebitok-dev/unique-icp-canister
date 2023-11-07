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
    const review: Review = { id: uuidv4(), createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    reviewStorage.insert(review.id, review);
    return Result.Ok(review);
}

$update;
export function updateReview(id: string, payload: ReviewPayload): Result<Review, string> {
    return match(reviewStorage.get(id), {
        Some: (review) => {
            const updatedReview: Review = {...review, ...payload, updatedAt: Opt.Some(ic.time())};
            reviewStorage.insert(review.id, updatedReview);
            return Result.Ok<Review, string>(updatedReview);
        },
        None: () => Result.Err<Review, string>(`couldn't update a review with id=${id}. review not found`)
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