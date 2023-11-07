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

// New Functions:

// Function 1: Add a new review with a custom ID
$update;
export function addReviewWithCustomID(id: string, payload: ReviewPayload): Result<Review, string> {
    if (reviewStorage.contains(id)) {
        return Result.Err<Review, string>(`a review with id=${id} already exists`);
    }
    const review: Review = { id, createdAt: ic.time(), updatedAt: Opt.None, ...payload };
    reviewStorage.insert(id, review);
    return Result.Ok(review);
}

// Function 2: Delete a review by ID
$update;
export function deleteReview(id: string): Result<Review, string> {
    if (reviewStorage.contains(id)) {
        const review = reviewStorage.remove(id);
        return Result.Ok(review);
    }
    return Result.Err<Review, string>(`a review with id=${id} not found`);
}

// Function 3: Get the total number of reviews
$query;
export function getTotalReviewCount(): Result<nat64, string> {
    const count = reviewStorage.size();
    return Result.Ok(count);
}

// Function 4: Get the average rating of all reviews
$query;
export function getAverageRating(): Result<number, string> {
    const reviews = reviewStorage.values();
    const totalReviews = reviews.length;
    if (totalReviews === 0) {
        return Result.Err<number, string>('No reviews available to calculate the average rating');
    }
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / totalReviews;
    return Result.Ok(average);
}

// Function 5: Get the latest reviews
$query;
export function getLatestReviews(count: nat64): Result<Vec<Review>, string> {
    if (count <= nat64.fromInt32(0)) {
        return Result.Err<Vec<Review>, string>('Invalid count provided');
    }
    const reviews = reviewStorage.values();
    const latestReviews = reviews.slice(-count.toNumber());
    return Result.Ok(latestReviews);
}

// Function 6: Check if a review with a specific ID exists
$query;
export function reviewExists(id: string): Result<boolean, string> {
    const exists = reviewStorage.contains(id);
    return Result.Ok(exists);
}

// Function 7: Get reviews with a minimum rating
$query;
export function getReviewsWithMinRating(minRating: number): Result<Vec<Review>, string> {
    const reviews = reviewStorage.values().filter(review => review.rating >= minRating);
    return Result.Ok(reviews);
}

// Function 8: Get reviews created after a specific timestamp
$query;
export function getReviewsCreatedAfter(timestamp: nat64): Result<Vec<Review>, string> {
    const reviews = reviewStorage.values().filter(review => review.createdAt > timestamp);
    return Result.Ok(reviews);
}

// Function 9: Get reviews updated after a specific timestamp
$query;
export function getReviewsUpdatedAfter(timestamp: nat64): Result<Vec<Review>, string> {
    const reviews = reviewStorage.values().filter(review => review.updatedAt.isSome() && review.updatedAt.unwrap() > timestamp);
    return Result.Ok(reviews);
}

// Function 10: Clear all reviews (Admin function)
$update;
export function clearAllReviews(): Result<void, string> {
    reviewStorage.clear();
    return Result.Ok(undefined);
}

// Workaround for making uuid package work with Azle
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
