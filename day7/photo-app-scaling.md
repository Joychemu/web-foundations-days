Day 7 Assignment: Scaling SnapShare
1. Assumptions and daily active users
SnapShare is a photo-sharing application where users upload photos and view a feed of photos from people they follow.

The following assumptions are used for the calculations:
- Registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads one photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each photo has one thumbnail of 50 KB.
- A day has 86,400 seconds.
- Peak traffic is five times the average traffic.
- All daily active users are assumed to perform the stated upload and feed-view activities.
- Storage estimates assume all uploaded originals and thumbnails are retained for one year, without compression or deletion.
- Upload and feed-view rates are averaged over 24 hours; actual traffic will vary throughout the day.
Daily active users calculation:
\[
10,000,000 \times 10\% = 1,000,000
\]

Therefore, SnapShare has 1 million daily active users.
2. Traffic and storage calculations
A. Uploads per second
Each of the 1 million daily active users uploads one photo per day.
\[
\text{Daily uploads} = 1,000,000 \times 1
= 1,000,000
\]

\[
\text{Uploads per second} =
\frac{1,000,000}{86,400}
\approx 11.57
\]

SnapShare receives approximately 11.6 photo uploads per second on average.
B. Feed views per second
Each active user views 50 feed pages per day.
\[
\text{Daily feed views} = 1,000,000 \times 50
= 50,000,000
\]

\[
\text{Average feed views per second} =
\frac{50,000,000}{86,400}
\approx 578.7
\]

Peak feed views are estimated at five times the average.
\[
\text{Peak feed views per second}
= 578.7 \times 5
\approx 2,894
\]

SnapShare should therefore plan for approximately 579 feed views per second on average and 2,894 per second at peak.
C. Photo storage per year
Each uploaded photo requires storage for the original and its thumbnail.
- Original photo: 2 MB.
- Thumbnail: 50 KB = 0.05 MB, assuming decimal units.
- Total per photo: 2.05 MB.
Daily storage:
\[
1,000,000 \times 2.05\text{ MB}
= 2,050,000\text{ MB}
\]

This is approximately 2.05 TB per day using decimal units.

Annual storage:
\[
2.05\text{ TB} \times 365
= 748.25\text{ TB}
\]

The estimated annual storage requirement is 748.25 TB, including original photos and thumbnails, before accounting for replication, backups, metadata, and any additional storage overhead.

Storage note: These calculations use 1 TB = 1,000 GB and 1 GB = 1,000 MB. Actual storage requirements will depend on the storage provider, replication policy, and retention rules.
Summary of estimates
Metric	Estimated value
Registered users	10 million
Daily active users	1 million
Daily photo uploads	1 million
Average uploads per second	11.6
Daily feed views	50 million
Average feed views per second	579
Peak feed views per second	2,894
Storage per day	2.05 TB
Storage per year	748.25 TB

3. Is SnapShare read-heavy or write-heavy?
SnapShare is a read-heavy system because users view approximately 50 million feed pages per day, compared with 1 million photo uploads per day.

This means the system performs about 50 feed-page reads for every photo upload, although a feed view may generate multiple database queries and photo requests.

The architecture should prioritize fast feed loading and efficient delivery of photos by:
- Using a CDN (Content Delivery Network) to deliver photos and thumbnails close to users.
- Using a cache to store frequently accessed feed data and metadata.
- Using database read replicas to distribute read traffic.
- Scaling application servers horizontally to handle increasing traffic.
- Processing thumbnail creation asynchronously so uploads do not have to wait for image processing.
4. Why photos should not be stored inside the database
Photos should not be stored directly inside the database because large binary files increase database size, backup and restore times, and storage costs. They can also make database performance and scaling more difficult.

Instead, SnapShare should use object storage for the original photo files and thumbnails, while the database stores metadata such as:
- Photo ID.
- User ID of the uploader.
- Caption and upload timestamp.
- Object storage key or URL for the original photo.
- Object storage key or URL for the thumbnail.
- Visibility and access permissions.
This approach separates large media files from structured application data, making both easier to manage and scale independently.
5. Architecture diagram
The following text diagram shows the proposed architecture.
                   +----------------------+
                   |        Users         |
                   +----------+-----------+
                              |
                              v
                   +----------------------+
                   |         CDN          |
                   | Photos & Thumbnails  |
                   +----------+-----------+
                              |
                              v
                   +----------------------+
                   |    Load Balancer     |
                   +----------+-----------+
                              |
                              v
                +---------------------------+
                |      App Servers          |
                | Uploads, Feeds, Auth      |
                +------+--------------------+
                       |
             +---------+----------+
             |                    |
             v                    v
   +------------------+  +----------------------+
   | Cache             |  | Primary Database     |
   | Feed & Metadata   |  | Users, Posts, Follows|
   +------------------+  +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         | Database Read Replica|
                         | Feed/Metadata Reads  |
                         +----------------------+

        PHOTO UPLOAD AND THUMBNAIL PROCESSING

   App Servers
        |
        +-----------------------> Object Storage
        |                         Original Photos
        |
        v
   +------------------+
   | Message Queue    |
   | Thumbnail Jobs   |
   +--------+---------+
            |
            v
   +------------------+
   | Thumbnail Worker |
   | Resize & Compress|
   +--------+---------+
            |
            v
   +------------------+
   | Object Storage   |
   | Thumbnails       |
   +------------------+
            |
            v
           CDN


6. Explanation of each component
1. Users: Upload photos and request feeds containing photos shared by accounts they follow.
2. CDN: Delivers frequently accessed photos and thumbnails from geographically distributed locations, reducing latency and load on the origin storage.
3. Load balancer: Distributes incoming application requests across multiple app servers to prevent any one server from becoming overloaded.
4. App servers: Handle authentication, upload requests, feed generation, permissions, and communication with the database and storage services.
5. Cache: Stores frequently requested feed data and metadata to reduce repeated database queries and improve response times.
6. Primary database: Stores structured information such as users, posts, follows, captions, permissions, and references to stored photos.
7. Database read replica: Handles eligible read queries separately from the primary database, reducing read pressure on the primary.
8. Object storage: Stores the large original photo files and generated thumbnails independently of the database.
9. Message queue: Holds thumbnail-generation jobs until workers are available, allowing uploads to finish without waiting for image processing.
10. Thumbnail worker: Retrieves queued jobs, resizes and compresses photos into thumbnails, stores the results in object storage, and updates the associated metadata when necessary.
7. Photo upload flow, step by step
1. User selects a photo: The user chooses a photo and submits it through the SnapShare application.
2. Request reaches the app server: The load balancer routes the upload request to a healthy application server.
3. Authentication and validation: The app server verifies the user's identity, checks upload permissions, and validates the file type and size.
4. Store the original: The app server uploads the original photo to object storage, using a unique object key.
5. Save metadata: The app server records the photo's metadata and object storage reference in the primary database.
6. Queue a thumbnail job: The app server places a message in the queue containing the photo ID and the original object's storage key.
7. Confirm the upload: Once the original photo and required metadata are safely stored and the job is queued, the application can return a successful upload response without waiting for thumbnail creation.
8. Process the queued job: A thumbnail worker retrieves the job, downloads or reads the original photo, and resizes it to create a 50 KB thumbnail target.
9. Store the thumbnail: The worker uploads the generated thumbnail to object storage and updates the database metadata to reference it.
10. Deliver the photo: The CDN serves the thumbnail or original photo when requested, subject to the application's access-control rules.
The queue should support retries and failed-job handling so temporary worker or storage failures do not permanently lose thumbnail jobs. The worker should also be idempotent, meaning that retrying the same job does not create inconsistent results.
8. Trade-offs
Trade-off 1: Caching versus data freshness
- Benefit: Caching reduces database load and improves feed response times.
- Cost: Users may temporarily see stale feed data after a new photo is uploaded or a follow relationship changes.
- Mitigation: Use cache expiration, targeted invalidation, and short time-to-live values for frequently changing data.
Trade-off 2: Asynchronous thumbnail generation versus immediate availability
- Benefit: A message queue allows the upload to finish quickly without waiting for thumbnail processing.
- Cost: A thumbnail may not be available immediately after an upload.
- Mitigation: Show a placeholder until the thumbnail is ready, retry failed jobs, and monitor queue delays.
Trade-off 3: Database read replicas versus consistency
- Benefit: Read replicas distribute read traffic and reduce the workload on the primary database.
- Cost: Replication lag can cause users to see recently uploaded photos or updated metadata later than expected.
- Mitigation: Route critical read-after-write requests to the primary database or use consistency-aware routing.
Trade-off 4: CDN performance versus cost and invalidation complexity
- Benefit: A CDN reduces latency and the amount of traffic reaching object storage.
- Cost: CDN bandwidth and cache invalidation can add cost and operational complexity.
- Mitigation: Use immutable, versioned photo URLs, suitable cache-control policies, and access controls for private photos.