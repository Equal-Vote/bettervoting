export const sharedConfig = {
    FREE_TIER_PRIVATE_VOTER_LIMIT: 100,
    ELECTION_VOTER_LIMIT_OVERRIDES: {
        'ee948c52-f79e-4449-acb1-1296debc0884': 10,
        'h33qt8': 1000, // Brianna Johns, Gathering for Open Science Hardware
        '7tcryp': 3000, // DSA-LA 2025 Local Officer Election
        'j87vqp': 5000, // DSA-LA 2025 Local Officer Election #2
        'g3mvqw': 5000, // DSA-LA 2025 Subgroup Officer Election
        'x36qt9': 400, // Thijs Kleinpaste, Bike farm
        't7dyvf': 400, // Thijs Kleinpaste, Bike farm #2
        'g8jf8t': 200, // Python Steering Election
    },
    TEMPORARY_ACCESS_HOURS: 10,
    CLASSIC_DOMAIN: 'https://classic.star.vote',
    FF_ELECTION_ROLES: 'false',
    FF_CANDIDATE_DETAILS: 'false',
    FF_CANDIDATE_PHOTOS: 'false',
    FF_VOTER_FLAGGING: 'false',
    FF_ELECTION_TESTIMONIALS: 'false',
    FF_PRECINCTS: 'false',
    FF_THEMES: 'false',
    FF_ALL_STATS: 'false',
    DEV_USERS: [
        'bc111019-40b1-41ad-9cc4-c292d3a8dc84', // Arend -  primary
        'df7d74a1-a2f6-48a7-b386-64705d1ec629', // Arend
        '153a6be8-9fcb-49f4-bc7c-35c4567f8b90', // Arend
        '61ff6b6d-b609-4f4e-a522-60aa8ef3bb55', // Arend
        '408e5aa0-38ac-4fc5-94bb-06fa299904e5', // Arend
        'f3da6b1c-7c0b-4f79-95cf-495a65c6fabe', // Mike - gmail
        '96b21554-7534-491b-a238-6d9e369ab66b', // Mike - equal vote
        'b1145db5-7fc1-4adf-b148-49563d2c5942', // Mike - hotmail
        '867bb64d-4ba7-45e6-b1cf-b96a35c8c59a', // Adam - primary
        'f6f04943-9303-4228-88fb-b8437e6a7868', // Adam - star2.user1
        '19656010-8bb8-4a8c-b277-3d36b750bea8', // Adam - star2.user3
        'bef10055-d4b3-4596-99ef-7849c54ab209', // Adam - star2.user6
        'd6ff970c-6aba-428b-9b2a-b1365ef91126', // Adam - star2.user55
        '34318994-805f-427f-8b4c-7f9308b36234', // Jon
        '64540740-adeb-45d1-a1a2-bf95784acccd', // Jackson
        'f390dfb3-cc26-4f54-94a3-3a6dd54693b6', // Evans
        '2a2733a1-46fe-41b2-b459-388d97b92c51', // Evans
    ],
    REAL_ELECTIONS_FROM_DEVS: [
        // Real elections under Arend's account
        'pres24', 
        'meta_pets', 
        'pet',
    ]
};
