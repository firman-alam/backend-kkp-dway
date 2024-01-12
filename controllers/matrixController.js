const pool = require('../config/dbConfig')
const { getUserIdFromToken } = require('./userController')

const GetAllNilai = async (req, res) => {
  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT
          p.id_pegawai,
          p.nama AS pegawai_nama,
          p.nik,
          h.tahun,
          h.id_penilaian
        FROM
          pegawai p
        JOIN
          data_penilaian_header h ON p.id_pegawai = h.id_pegawai;
      `
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
          SELECT
            d.id_kriteria,
            d.nilai,
            k.nama AS kriteria_nama,
            k.code
          FROM
            data_penilaian_detail d
          JOIN
            kriteria k ON d.id_kriteria = k.id_kriteria
          WHERE
            d.id_penilaian_detail = ?;
        `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        nama: headerData.pegawai_nama,
        nik: headerData.nik,
        tahun: headerData.tahun,
        id_penilaian: headerData.id_penilaian,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const GetNilai = async (req, res) => {
  const nilaiId = req.params.id

  try {
    // Fetch data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
      SELECT
        p.id_pegawai,
        p.nama AS pegawai_nama,
        h.tahun,
        h.id_penilaian
      FROM
        pegawai p
      JOIN
        data_penilaian_header h ON p.id_pegawai = h.id_pegawai
      WHERE
        h.id_penilaian = ?;
    `,
      [nilaiId]
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      await connection.end()
      return res.status(404).send('Data not found')
    }

    const headerData = headerResults[0]

    // Fetch details from data_penilaian_detail
    const [detailsResults] = await pool.promise().query(
      `
      SELECT
        d.id_kriteria,
        d.nilai,
        k.nama AS kriteria_nama,
        k.code
      FROM
        data_penilaian_detail d
      JOIN
        kriteria k ON d.id_kriteria = k.id_kriteria
      WHERE
        d.id_penilaian_detail = ?;
    `,
      [nilaiId]
    )

    // Combine header and details data
    const responseData = {
      id_pegawai: headerData.id_pegawai,
      nama: headerData.pegawai_nama,
      tahun: headerData.tahun,
      id_penilaian: headerData.id_penilaian,
      details: detailsResults,
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const checkAlternatifExists = async (alternatif) => {
  const [result] = await pool
    .promise()
    .query(
      'SELECT COUNT(*) as count FROM matriks_penilaian_header WHERE alternatif = ?',
      [alternatif]
    )

  return result[0].count > 0
}

const AddNilai = async (req, res) => {
  const { id_pegawai, tahun, details } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // Insert into data_penilaian_header table
    const [headerResult] = await pool
      .promise()
      .query(
        'INSERT INTO data_penilaian_header (id_pegawai, tahun, created_by, created_date) VALUES (?, ?, ?, NOW())',
        [id_pegawai, tahun, userId]
      )

    const idPenilaian = headerResult.insertId

    // Insert into data_penilaian_detail table
    const detailQuery =
      'INSERT INTO data_penilaian_detail (id_penilaian_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

      for (const [id_kriteria, nilai] of Object.entries(details)) {
      const detailValues = [
        idPenilaian,
        id_kriteria,
        nilai,
        userId,
      ]

      await pool.promise().query(detailQuery, detailValues)
    }

    let alternatif = 'A1'
    let counter = 1

    while (await checkAlternatifExists(alternatif)) {
      counter++
      alternatif = `A${counter}`
    }

    await pool
      .promise()
      .query(
        'INSERT INTO matriks_penilaian_header (id_pegawai, id_matriks, alternatif, created_by, created_date) VALUES (?, ?, ?, ?, NOW())',
        [id_pegawai, idPenilaian, alternatif, userId]
      )

      console.log('ok')

    // insert into matriks_penilaian_detail table
    const matriksDetailQuery =
      'INSERT INTO matriks_penilaian_detail (id_matriks_detail, id_kriteria, nilai, preferensi, created_by, created_date) VALUES (?, ?, ?, ?, ?, NOW())'

    // Get data from criteria table
    const [criteriaRows] = await pool.promise().query('SELECT * FROM kriteria')

    // Get data from matriks_penilaian_detail table
    const [matriksDetailRows] = await pool
      .promise()
      .query('SELECT * FROM matriks_penilaian_detail')

    // Loop through details
    for (const [id_kriteria, nilai] of Object.entries(details)) {
      
      // Check for detail id kriteria same as kriteria id kriteria
      const matchingCriteria = criteriaRows.find(
        (criteria) => criteria.id_kriteria == id_kriteria
      )

      if (matchingCriteria) {
        if (matchingCriteria.tipe === 'benefit') {
          // If type is benefit, get highest nilai in matriks_penilaian_detail with same id kriteria
          const highestBenefit = Math.max(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )
       
          // Divide detail nilai with highest nilai from matriks_penilaian_detail
          const normalizedValue = nilai / highestBenefit == 0 ? nilai : highestBenefit
          const preferensi = normalizedValue * matchingCriteria.bobot

           // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idPenilaian,
              id_kriteria,
              normalizedValue,
              preferensi,
              userId,
            ])
        } else if (matchingCriteria.tipe === 'cost') {
          // If type is cost, get lowest nilai in matriks_penilaian_detail with same id kriteria
          const lowestCost = Math.min(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide lowest nilai from matriks_penilaian_detail with detail nilai
          const normalizedValue =  lowestCost == 0 ? nilai : lowestCost / nilai
          const preferensi = normalizedValue * matchingCriteria.bobot
          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idPenilaian,
              id_kriteria,
              normalizedValue,
              preferensi,
              userId,
            ])
        }
      }
    }

    const allDetailRows = await pool
      .promise()
      .query(
        'SELECT preferensi FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
        [idPenilaian]
      )

    // Calculate the sum of preferensi values
    const totalPreferensi = allDetailRows[0].reduce(
      (sum, row) => sum + row.preferensi,
      0
    )

    // Update the total field in matriks_penilaian_header
    await pool
      .promise()
      .query(
        'UPDATE matriks_penilaian_header SET total = ? WHERE id_matriks = ?',
        [totalPreferensi, idPenilaian]
      )

    res.status(200).json({ message: 'Data inserted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const EditNilai = async (req, res) => {
  const { id_penilaian, id_pegawai, tahun, details } = req.body
  const userId = getUserIdFromToken(req.headers.authorization)

  try {
    // delete data penilain deails
    await pool
      .promise()
      .query(
        'DELETE FROM data_penilaian_detail WHERE id_penilaian_detail = ?',
        [id_penilaian]
      )

    // update into data_penilaian_header table
    const [headerResult] = await pool
      .promise()
      .query(
        'Update data_penilaian_header (id_pegawai, tahun, created_by, created_date) VALUES (?, ?, ?, NOW())',
        [id_pegawai, tahun, userId]
      )

    const idPenilaian = headerResult.insertId

    // Insert into data_penilaian_detail table
    const detailQuery =
      'INSERT INTO data_penilaian_detail (id_penilaian_detail, id_kriteria, nilai, created_by, created_date) VALUES (?, ?, ?, ?, NOW())'

    for (const detail of details) {
      const detailValues = [
        idPenilaian,
        detail.id_kriteria,
        detail.nilai,
        userId,
      ]

      await pool.promise().query(detailQuery, detailValues)
    }

    // delete data penilain deails
    await pool
      .promise()
      .query(
        'DELETE FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
        [id_penilaian]
      )

    const [headerMatriks] = await pool
      .promise()
      .query(
        'UPDATE matriks_penilaian_header (id_pegawai, created_by, created_date) VALUES (?, ?, NOW())',
        [id_pegawai, userId]
      )

    const idMatriks = headerMatriks.insertId

    // insert into matriks_penilaian_detail table
    const matriksDetailQuery =
      'INSERT INTO matriks_penilaian_detail (id_matriks_detail, id_kriteria, nilai, preferensi, created_by, created_date) VALUES (?, ?, ?, ?, ?, NOW())'

    // Get data from criteria table
    const [criteriaRows] = await pool.promise().query('SELECT * FROM kriteria')

    // Get data from matriks_penilaian_detail table
    const [matriksDetailRows] = await pool
      .promise()
      .query('SELECT * FROM matriks_penilaian_detail')

    // Loop through details
    for (const detail of details) {
      const { id_kriteria } = detail

      // Check for detail id kriteria same as kriteria id kriteria
      const matchingCriteria = criteriaRows.find(
        (criteria) => criteria.id_kriteria === id_kriteria
      )

      if (matchingCriteria) {
        if (matchingCriteria.tipe === 'benefit') {
          // If type is benefit, get highest nilai in matriks_penilaian_detail with same id kriteria
          const highestBenefit = Math.max(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide detail nilai with highest nilai from matriks_penilaian_detail
          const normalizedValue =
            detail.nilai / highestBenefit == 0 ? detail.nilai : highestBenefit
          const preferensi = normalizedValue * matchingCriteria.bobot

          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idMatriks,
              id_kriteria,
              normalizedValue,
              preferensi,
              userId,
            ])
        } else if (matchingCriteria.tipe === 'cost') {
          // If type is cost, get lowest nilai in matriks_penilaian_detail with same id kriteria
          const lowestCost = Math.min(
            ...matriksDetailRows
              .filter((row) => row.id_kriteria === id_kriteria)
              .map((row) => row.nilai)
          )

          // Divide lowest nilai from matriks_penilaian_detail with detail nilai
          const normalizedValue =
            lowestCost == 0 ? detail.nilai : lowestCost / detail.nilai
          const preferensi = normalizedValue * matchingCriteria.bobot
          // Add data to matriks_penilaian_detail
          await pool
            .promise()
            .query(matriksDetailQuery, [
              idMatriks,
              id_kriteria,
              normalizedValue,
              preferensi,
              userId,
            ])
        }
      }
    }

    const allDetailRows = await pool
      .promise()
      .query(
        'SELECT preferensi FROM matriks_penilaian_detail WHERE id_matriks = ?',
        [idMatriks]
      )

    // Calculate the sum of preferensi values
    const totalPreferensi = allDetailRows[0].reduce(
      (sum, row) => sum + row.preferensi,
      0
    )

    // Update the total field in matriks_penilaian_header
    await pool
      .promise()
      .query(
        'UPDATE matriks_penilaian_header SET total = ? WHERE id_matriks = ?',
        [totalPreferensi, idMatriks]
      )

    res.status(200).json({ message: 'Data inserted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const DeleteNilai = async (req, res) => {
  const id_penilaian = req.params.id

  try {
    // Check if the record exists in data_penilaian_header
    const [headerResult] = await pool
      .promise()
      .query('SELECT * FROM data_penilaian_header WHERE id_penilaian = ?', [
        id_penilaian,
      ])

    // If the record doesn't exist, return a 404 response
    if (headerResult.length === 0) {
      return res.status(404).json({ message: 'Data not found' })
    }

    // Delete data from data_penilaian_detail
    await pool
      .promise()
      .query(
        'DELETE FROM data_penilaian_detail WHERE id_penilaian_detail = ?',
        [id_penilaian]
      )

    // Delete data from data_penilaian_header
    await pool
      .promise()
      .query('DELETE FROM data_penilaian_header WHERE id_penilaian = ?', [
        id_penilaian,
      ])

    await pool
      .promise()
      .query(
        'DELETE FROM matriks_penilaian_detail WHERE id_matriks_detail = ?',
        [id_penilaian]
      )

    // Delete data from data_penilaian_header
    await pool
      .promise()
      .query('DELETE FROM matriks_penilaian_header WHERE id_matriks = ?', [
        id_penilaian,
      ])

    res.status(200).json({ message: 'Data deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).send('Internal Server Error')
  }
}

const GetMatrixs = async (req, res) => {
  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT p.id_pegawai, h.alternatif, h.id_matriks
        FROM pegawai p
        JOIN matriks_penilaian_header h ON p.id_pegawai = h.id_pegawai
        ORDER BY h.alternatif ASC;
      `
    )

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }

    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
            SELECT
              d.id_kriteria,
              d.nilai,
              k.nama AS kriteria_nama,
              k.code,
              d.preferensi
            FROM
              matriks_penilaian_detail d
            JOIN
              kriteria k ON d.id_kriteria = k.id_kriteria
            WHERE
              d.id_matriks_detail = ?;
          `,
        [headerData.id_matriks]
      )

      console.log(headerData)

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        alternatif: headerData.alternatif,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

const GetRanks = async (req, res) => {
  const { tahun, size } = req.query;

  try {
    // Fetch all data from data_penilaian_header
    const [headerResults] = await pool.promise().query(
      `
        SELECT
          p.id_pegawai,
          p.divisi,
          p.nik,
          p.nama,
          h.alternatif,
          d.id_penilaian,
          h.total,
          d.tahun,
          h.alternatif
        FROM
          pegawai p
        JOIN matriks_penilaian_header h ON p.id_pegawai = h.id_pegawai
        JOIN data_penilaian_header d ON p.id_pegawai = d.id_pegawai
        WHERE
          d.tahun = ?
        ORDER BY h.total DESC
        LIMIT ?
      `,
      [tahun, parseInt(size, 10)]
    );    

    // Check if any results were found
    if (headerResults.length === 0) {
      return res.status(404).send('No data found')
    }
    
    const responseData = []

    // Iterate through each header record
    for (const headerData of headerResults) {
      // Fetch details from data_penilaian_detail for each header record
      const [detailsResults] = await pool.promise().query(
        `
                SELECT
                  d.id_kriteria,
                  d.nilai,
                  k.nama AS kriteria_nama,
                  k.code,
                  d.preferensi
                FROM
                  matriks_penilaian_detail d
                JOIN
                  kriteria k ON d.id_kriteria = k.id_kriteria
                WHERE
                  d.id_matriks_detail = ?;
              `,
        [headerData.id_penilaian]
      )

      // Combine header and details data
      const result = {
        id_pegawai: headerData.id_pegawai,
        divisi: headerData.divisi,
        nik: headerData.nik,
        nama: headerData.nama,
        alternatif: headerData.alternatif,
        total: headerData.total,
        tahun: headerData.tahun,
        details: detailsResults,
      }

      // Push the combined data to the response array
      responseData.push(result)
    }

    // Send the JSON response
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching data:', error)
    res.status(500).send('Internal Server Error')
  }
}

module.exports = {
  GetAllNilai,
  GetNilai,
  AddNilai,
  EditNilai,
  DeleteNilai,
  GetMatrixs,
  GetRanks,
}
